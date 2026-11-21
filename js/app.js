import {api, ApiError, isConnected, isWriteEnabled, createRequestId} from './api.js?v=20261114-adminauth1';

const config = window.NGD_CONFIG || {};
const by = (id) => document.getElementById(id);
// Canonical brand asset is the same favicon URL in public and STAGING pages.
const defaultBrandLogoSrc=document.querySelector?.('.guest-brand-icon .ngd-brand-image')?.src||
  document.querySelector?.('link[rel="icon"]')?.href||'';
// Published CMS logo overrides the default on visible UI; favicon stays static.
function brandLogoSrc_(){
  const item=window.NGD_CONTENT_UI?.published(state.siteContent,'BRAND_LOGO','brand')?.[0];
  return (item&&window.NGD_CONTENT_UI?.mediaPath(item.image_path))||defaultBrandLogoSrc;
}
// PAGE_COVER is art within a pre-existing hero, never a second stacked hero.
function cmsPageArt_(route){
  const item=window.NGD_CONTENT_UI?.published(state.siteContent,'PAGE_COVER',route)?.[0];
  return item?window.NGD_CONTENT_UI.mediaPath(item.image_path):'';
}
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
  beranda:['Beranda','home'],belajar:['Kelas','book'],menu:['Menu','grid'],
  lms:['Kelola Kelas','book'],['lms-editor']:['Ruang Materi','book'],
  ['lms-lesson']:['Editor Pelajaran','book'],['lms-course']:['Ruang Kelas','book'],
  ['lms-ai']:['Review Draft AI','spark'],
  ['lms-complete']:['Pelajaran Selesai','check'],katalog:['Katalog','store'],
  ai:['Studio AI','spark'],['ai-tool']:['Ruang Alat AI','spark'],affiliate:['Ajak Teman','link'],akun:['Akun','user'],
  produk:['Katalog Admin','store'],jasa:['Jasa','gift'],layanan:['Pesanan Jasa','gift'],
  admin:['Admin','grid'],konten:['Gambar & Banner','grid'],pesanan:['Pesanan','clipboard'],member:['Member','users'],
  antrean:['Daftar Tunggu','clock'],dukungan:['Bantuan','shield'],
  tiket:['Detail tiket','shield'],member360:['Member 360°','users'],
  rilis:['Pembaruan','check'],pengaturan:['Pengaturan','shield'],login:['Masuk','user'],['admin-login']:['Masuk Admin','shield'],daftar:['Daftar','users'],checkout:['Pembayaran','wallet']
};
const guestNav=['beranda','katalog','jasa','dukungan'];
const memberNav=['beranda','katalog','ai','jasa','belajar','pesanan','affiliate','dukungan','akun'];
const adminOnlyRoutes=new Set(['admin','konten','produk','layanan','lms','lms-editor','lms-lesson','lms-ai','member','antrean','pengaturan']);
const adminNav=['admin','konten','produk','layanan','lms','pesanan','member','dukungan','rilis','antrean','pengaturan','akun'];
const adminContextRoute=(route)=>({
  'lms-editor':'lms','lms-lesson':'lms','lms-ai':'lms',
  'member360':'member',tiket:'dukungan','ai-tool':'ai'
})[route]||route;
const tokenKey='ngd_member_session';
const firstInviterKey='ngd_first_inviter_v1';
const firstInviterTtlMs=30*24*60*60*1000;
function firstInviter_(){
  try{
    if(typeof localStorage==='undefined')return '';
    const raw=localStorage.getItem(firstInviterKey);
    if(!raw)return '';
    const saved=JSON.parse(raw),code=String(saved?.code||'');
    if(!/^[A-Za-z0-9_-]{3,80}$/.test(code)||!Number.isFinite(saved?.expiresAt)||
       saved.expiresAt<=Date.now()){
      localStorage.removeItem(firstInviterKey);return '';
    }
    return code;
  }catch{return '';}
}
function captureFirstInviter_(){
  const prior=firstInviter_();
  if(prior)return prior;
  try{
    const code=String(new URLSearchParams(location.search).get('ref')||'').trim().toUpperCase();
    if(!/^[A-Z0-9_-]{3,80}$/.test(code))return '';
    if(typeof localStorage!=='undefined')
      localStorage.setItem(firstInviterKey,JSON.stringify({code,expiresAt:Date.now()+firstInviterTtlMs}));
    return code;
  }catch{return '';}
}
// Production catalogue must come from getKatalog; never invent product prices
// when the API is temporarily unavailable.
const PREVIEW_MODULES=[
  'Orientasi dan Setup Akun','Bio Link dan Profil Bisnis','Katalog dan Checkout Kurir',
  'Konten Cepat dengan Studio AI','Kasir POS Sederhana','Strategi Ajak Teman'
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
  info:null,catalog:[],siteContent:[],adminContent:[],contentEditId:'',contentPresetProductId:'',contentRequestId:null,heroIndex:0,heroPaused:false,home:null,modules:[],tools:[],publicTools:[],publicToolsLoaded:false,orders:[],
  affiliates:null,partnerShelf:[],partnerShelfLoaded:false,waitlist:[],members:[],adminOrders:[],adminSummary:null,
  reconciliation:null,selectedProduct:null,lastOrder:null,checkoutProductId:'',checkoutRequestId:null,orderDetailLoading:false,checkoutReturnRoute:'katalog',loading:false,
  memberProducts:[],creditHistory:[],supportTickets:[],supportReleases:[],supportOverview:null,
  adminSupportTickets:[],ticketDetail:null,selectedTicketId:null,
  memberSearch:null,member360:null,selectedMemberId:null,
  lmsCourses:[],lmsEnrollments:[],lmsAdminCourses:[],
  lmsCourseDetail:null,lmsAdminCourse:null,lmsSelectedCourseId:null,
  lmsSelectedLessonId:null,lmsJobs:[],lmsSelectedAIJobId:null,
  lmsCompletion:null,notifications:{enabled:false,items:[],unread:0},catalogFilter:'semua',marketplaceSearch:'',marketplaceSort:'default',
  adminCatalog:[],catalogEditId:'',catalogRequestId:null,
  adminRuntime:null,adminRuntimeError:'',adminSettings:null,adminSettingsError:'',adminPaymentReviewId:'',workspaceInfo:null,
  services:[],selectedServiceId:'',serviceKind:'VIDEO_AI',serviceRequestId:null,
  registrationOtpVerifiedWa:'',registrationWaitlist:null,publicStep:0,selectedAiToolId:'',aiCategory:'semua',aiSearch:'',pendingPurchaseId:'',pendingServiceRequest:false
};
const isAdmin=()=>state.me?.role==='ADMIN';
const adminLoginEnabled=()=>isConnected()&&config.adminLoginEnabled===true;
const registrationOtpEnabled=()=>isWriteEnabled()&&config.registrationOtpEnabled===true;
// Only STAGING member page opts in. Public and admin retain existing PIN behavior.
const memberOtpLoginEnabled=()=>isWriteEnabled()&&config.memberOtpLoginEnabled===true&&
  location.pathname.includes('/staging/');
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
  tiket:'dukungan',checkout:'pesanan',
  'lms-editor':'lms','lms-lesson':'lms','lms-ai':'lms',
  member360:'member'
})[route]||route;
function renderNav(){
  const items=isAdmin()?adminNav:logged()?memberNav:guestNav;
  const navIcon=(route)=>window.NGD_CONTENT_UI?.media(state.siteContent,'NAV_ICON',route,'nav-custom-icon','')||icon(screens[route][1]);
  const button=(route)=>'<button type="button" class="nav-item" data-route="'+route+'" '+(state.route===route?'aria-current="page"':'')+'>'+navIcon(route)+'<span>'+esc(screens[route][0])+'</span></button>';
  by('desktop-nav').innerHTML=items.map(button).join('');
  // V16: one header navigation on all viewports. Drawer is a real dialog-like
  // navigation surface, never a fixed bottom bar or a duplicated Menu page.
  const drawer=by('top-nav-drawer');
  if(drawer){
    const routes=isAdmin()?adminNav:logged()?
      ['beranda','katalog','jasa','ai','belajar','affiliate','pesanan']:guestNav;
    const names={beranda:logged()&&!isAdmin()?'Beranda Member':'Beranda',
      katalog:'Katalog',ai:'Studio AI',jasa:'Jasa',belajar:'Akses & Kelas',
      affiliate:'Ajak Teman',pesanan:'Pesanan',
      dukungan:'Bantuan',akun:'Profil',admin:'Dashboard'};
    drawer.innerHTML='<div class="top-nav-drawer-inner">'+
      '<p class="top-nav-drawer-label">'+(isAdmin()?'OPERASIONAL':logged()?'RUANG MEMBER':'JELAJAH')+'</p>'+
      '<nav aria-label="Navigasi utama">'+routes.map(route=>
        '<button type="button" data-route="'+route+'"'+
        (route===state.route?' aria-current="page"':'')+'>'+
        (names[route]||screens[route][0])+icon('arrow')+'</button>').join('')+
      '</nav>'+(logged()?'<button type="button" class="top-nav-drawer-signout" data-action="logout">Keluar</button>':
      '<button type="button" class="top-nav-drawer-signout" data-route="login">Masuk / Daftar Member</button>')+
      '</div>';
  }
  const tokenBadge=by('header-token');
  if(tokenBadge){
    tokenBadge.hidden=!logged()||isAdmin();
    tokenBadge.textContent=logged()&&!isAdmin()?
      Math.max(0,Number(state.home?.saldo_kredit??state.me?.saldo_kredit??0)||0).toLocaleString('id-ID')+' Token':'';
  }
  const orderLink=by('header-order');
  if(orderLink)orderLink.hidden=!logged()||isAdmin();
  by('page-label').textContent=screens[state.route]?.[0]||'Beranda';
  by('account-avatar').textContent=logged()?
    String(state.me.nama||'M').split(' ').map(v=>v[0]).join('').slice(0,2).toUpperCase():'ND';
  by('mode-indicator').textContent=isAdmin()?'PENGELOLA':logged()?'RUANG MEMBER':'NGULIK DIGITAL';
  const mark=by('brand-mark');
  if(mark)mark.innerHTML='<img class="ngd-brand-image" src="'+esc(brandLogoSrc_())+'" alt="" loading="eager">';
  const caption=by('sidebar-caption');
  if(caption)caption.textContent=isAdmin()?'Panel admin':logged()?'Menu member':'Menu';
  // A single commerce navigation also serves signed-in members; admin
  // continues using its private workspace and does not expose these routes.
  const publicNav=by('guest-nav');
  if(publicNav){
    const navRoutes=isAdmin()?[]:logged()?
      ['beranda','katalog','ai','jasa','belajar','pesanan','affiliate','dukungan']:
      ['beranda','katalog','jasa','dukungan'];
    const navNames={beranda:'Beranda',katalog:'Katalog',belajar:'Kelas',
      ai:'Studio AI',pesanan:'Pesanan',affiliate:'Ajak Teman',jasa:'Jasa',
      dukungan:'Bantuan'};
    publicNav.innerHTML=navRoutes.map(route=>
      '<button type="button" data-route="'+route+'">'+esc(navNames[route])+'</button>'
    ).join('');
  }
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
  empty('Masuk untuk membuka '+feature,'Masuk untuk melanjutkan.','login','Masuk');
// Browseable on mobile instead of hiding most routes behind a desktop-only sidebar.
// This is a presentation route: existing auth checks still guard every action.
function viewMore(){
  const routes=isAdmin()?adminNav:logged()?memberNav:[...guestNav,'login'];
  const descriptions={
    beranda:'Mulai dari sini',belajar:'Kelas dan progres',katalog:'Jasa dan produk',
    jasa:'Pesan jasa',ai:'Buat konten',affiliate:'Bagikan tautan',
    dukungan:'Tanya dan laporkan kendala',akun:'Profil akun',admin:'Ringkasan usaha',
    konten:'Gambar dan banner',produk:'Daftar Produk',layanan:'Permintaan pelanggan',
    lms:'Kelas dan materi',pesanan:'Riwayat belanja',member:'Data pelanggan',
    rilis:'Versi terbaru',antrean:'Pendaftar menunggu',pengaturan:'Atur aplikasi'
  };
  return '<section class="ngd-menu-page" aria-label="Semua menu">'+
    title(isAdmin()?'Pusat Operasional':logged()?'Ruang Kerja Saya':'Jelajahi Ngulik Digital',
      isAdmin()?'PENGELOLA':logged()?'AKSES MEMBER':'JELAJAH PUBLIK',
      isAdmin()?'Kelola transaksi, konten, pengguna, dan layanan.':logged()?'Pilih pekerjaan atau aktivitas yang ingin Anda lanjutkan.':'Kenali produk, alat, layanan, dan cara belajar sebelum bergabung.')+
    '<nav class="ngd-menu-grid" aria-label="Daftar seluruh fitur">'+routes.map(route=>
      '<button type="button" class="ngd-menu-tile" data-route="'+route+'">'+
      '<span class="ngd-menu-icon" aria-hidden="true">'+
      (window.NGD_CONTENT_UI?.media(state.siteContent,'FEATURE_ICON',route,'nav-custom-icon','')||icon(screens[route][1]))+'</span>'+
      '<span class="ngd-menu-copy"><strong>'+esc(screens[route][0])+'</strong><small>'+
      esc(descriptions[route]||'Buka fitur')+'</small></span>'+icon('arrow')+'</button>'
    ).join('')+'</nav>'+
    (!logged()?'<div class="ngd-menu-access"><p>Sudah punya akun?</p>'+
      '<button class="btn btn-primary" type="button" data-route="login">Masuk</button></div>':'')+
    '</section>';
}
// Free educational resources belong to the public HERO, not the top navigation.
const NGD_FREE_EBOOK_URL='https://cuan74468-ux.github.io/buku-pintar-vibe-coder/';
const NGD_FREE_CLASSROOM_URL='https://classroom.google.com/c/ODk4MzQ4OTEwMjc5?cjc=ozzbygx3';
function viewHeroFreeLinks_(){
  return '<nav class="ngd-hero-free-links" aria-label="Belajar gratis">'+
    '<a href="'+NGD_FREE_EBOOK_URL+'" target="_blank" rel="noopener noreferrer">eBook Gratis</a>'+
    '<a href="'+NGD_FREE_CLASSROOM_URL+'" target="_blank" rel="noopener noreferrer">Kelas Gratis</a>'+
  '</nav>';
}
// Three public service cards are sales entry points, never payment or account actions.
function viewHomeServices_(){
  const offers=[
    ['P-3IN1','Website & Katalog Online','Tampilkan produk usaha Anda lewat website yang mudah dibagikan.'],
    ['P-INTEGRASI-GAS','Aplikasi Kasir & Catatan Usaha','Catat penjualan dan pekerjaan harian dengan Google Sheets.'],
    ['P-VIDEO-AI','Jasa Video Iklan','Promosikan produk lewat video singkat yang menarik.']
  ];
  return '<section class="ngd-home-services" aria-label="Tiga jasa utama Ngulik Digital">'+
    '<header class="ngd-home-services-heading"><p>JASA UTAMA</p><h2>Pilih Jasa untuk Usaha Anda</h2></header>'+
    '<div class="ngd-home-services-grid">'+offers.map(([id,name,description],index)=>{
      const product=Array.isArray(state.catalog)?state.catalog.find(p=>
        String(p.product_id)===id&&!isPublicQaOffer_(p)):null;
      // getKatalog is already an active-only projection and omits `aktif`.
      // Only product IDs actually returned by the public API can be checked out.
      const label=product?offerUiTitle_(product):name;
      const detail=product?offerUiDescription_(product)||description:description;
      return '<article class="ngd-home-service" data-service-product="'+esc(id)+'">'+
        '<span class="ngd-home-service-number">0'+(index+1)+'</span>'+
        '<h3>'+esc(label)+'</h3>'+
        '<p>'+esc(detail)+'</p>'+
        (product?
          '<button type="button" class="ngd-home-service-cta" data-checkout-product="'+idSafe(id)+'">Lihat checkout '+icon('arrow')+'</button>':
          '<button type="button" class="ngd-home-service-cta" data-route="katalog">Lihat katalog '+icon('arrow')+'</button>')+
      '</article>';
    }).join('')+'</div>'+
  '</section>';
}
const safeBadge=(s)=>'<span class="chip '+(['AKTIF','FULFILLED','PAID','APPROVED'].includes(String(s))?'green':'orange')+'">'+esc(s||'-')+'</span>';
function viewHome(){
  if(isAdmin())return viewAdmin();
  if(logged()){
    const first=String(state.me.nama||'Member').trim().split(/\s+/)[0];
    const d=state.home||{};
    const safeBalance=Math.max(0,Number(d.saldo_kredit??state.me.saldo_kredit??0)||0);
    const orders=Array.isArray(state.orders)?state.orders:[];
    const waiting=orders.filter(o=>['PENDING','MENUNGGU_VERIFIKASI'].includes(String(o.status))).length;
    const completed=orders.filter(o=>['PAID','FULFILLED'].includes(String(o.status))).length;
    const products=Array.isArray(state.memberProducts)?state.memberProducts:[];
    const activeProducts=products.filter(x=>['AKTIF','ACTIVE','FULFILLED'].includes(
      String(x.akses_status||x.status||'').toUpperCase()));
    const enrollments=Array.isArray(state.lmsEnrollments)?state.lmsEnrollments:[];
    const activeClasses=enrollments.filter(x=>['ACTIVE','AKTIF'].includes(
      String(x.status||'').toUpperCase())).length;
    const approved=Array.isArray(state.affiliates?.komisi)?
      state.affiliates.komisi.filter(c=>c.status==='APPROVED'&&!c.payout_requested_at)
        .reduce((n,c)=>n+(Number(c.nominal)||0),0):0;
    const partnerActive=state.affiliates?.mitra_aktif===true;
    const activities=[
      ...orders.map(o=>({at:o.created_at||o.paid_at,label:'Pesanan '+String(o.order_id||''),
        detail:String(o.nama_produk||'Produk')+' · '+String(o.status||''),
        route:'pesanan'})),
      ...(Array.isArray(state.creditHistory)?state.creditHistory:[]).map(l=>({
        at:l.created_at,label:'Aktivitas token',
        detail:(Number(l.jumlah||0)>0?'+':'')+String(l.jumlah||0)+' token · '+String(l.tipe||''),
        route:'ai'})),
      ...(Array.isArray(state.affiliates?.komisi)?state.affiliates.komisi:[]).map(c=>({
        at:c.created_at,label:'Komisi '+String(c.status||''),
        detail:rupiah(c.nominal||0),route:'affiliate'}))
    ].filter(x=>x.at&&!Number.isNaN(new Date(x.at).getTime()))
      .sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,5);
    const access=[
      ...activeProducts.slice(0,3).map(p=>({
        label:String(p.nama||p.nama_produk||p.product_id||'Produk aktif'),route:'dukungan',
        detail:'Akses produk aktif · kelola di Bantuan'})),
      ...(activeClasses?[{label:activeClasses+' kelas aktif',route:'belajar',detail:'Lanjutkan materi Anda'}]:[])
    ];
    if(!access.length)access.push({label:'Studio AI',route:'ai',detail:'Mulai menggunakan alat AI yang tersedia'});
    const metrics=[
      ['Saldo Token',safeBalance.toLocaleString('id-ID')+' Token','ai','Buka Studio AI'],
      ['Akses Aktif',String(activeProducts.length+activeClasses),'belajar','Lihat akses & kelas'],
      ['Pesanan',waiting+' menunggu','pesanan',completed+' diproses / selesai'],
      ['Komisi Siap Tarik',rupiah(approved),'affiliate','Pantau ajak teman']
    ];
    return '<div class="ngd-member-home ngd-member-command">'+
      '<section class="member-welcome ngd-member-hero" aria-label="Dashboard Ngulik Digital Member">'+
        '<div class="ngd-member-hero-copy">'+
          '<p class="eyebrow">RUANG MEMBER / AKTIVITAS SAYA</p>'+
          '<h1>Halo, <span class="accent">'+esc(first)+'</span>.</h1>'+
          '<p class="lead">Ringkasan akun, akses digital, dan aktivitas terbaru Anda.</p>'+
          '<div class="ngd-member-badges"><span class="ngd-member-status">'+icon('check')+
            ' Akun '+esc(state.me.status||'Member')+'</span>'+
            '<button type="button" class="ngd-member-partner-status" data-route="affiliate">'+
              (partnerActive?'Link komisi aktif':'Link komisi belum aktif · Starter Rp15.000')+
            '</button></div>'+
        '</div></section>'+
      '<div class="metric-grid ngd-member-stats" aria-label="Ringkasan akun">'+
        metrics.map((m,i)=>i===0?
          '<section class="wallet-hero" aria-label="Dompet Token Universal">'+
            '<div class="wallet-top"><span>'+esc(m[0])+'</span>'+icon('wallet')+'</div>'+
            '<div class="wallet-value"><strong>'+esc(safeBalance.toLocaleString('id-ID'))+
              '</strong><span>Token</span></div>'+
            '<button type="button" class="ngd-member-stat-link" data-route="ai">'+esc(m[3])+
              ' '+icon('arrow')+'</button></section>':
          '<button type="button" class="metric-card" data-route="'+m[2]+'">'+
            '<small>'+esc(m[0])+'</small><strong>'+esc(m[1])+'</strong>'+
            '<span>'+esc(m[3])+' '+icon('arrow')+'</span></button>').join('')+
      '</div>'+
      '<section class="ngd-member-access" aria-label="Akses produk dan kelas">'+
        '<header class="ngd-member-section-head"><div><p class="eyebrow">AKSES SAYA</p>'+
          '<h2>Siap digunakan</h2></div>'+
          '<button type="button" data-route="dukungan">Kelola Akses '+icon('arrow')+'</button></header>'+
        '<div class="ngd-member-access-list">'+access.map(x=>
          '<button type="button" data-route="'+x.route+'"><span><strong>'+esc(x.label)+
            '</strong><small>'+esc(x.detail)+'</small></span>'+icon('arrow')+'</button>').join('')+
        '</div></section>'+
      '<section class="ngd-member-shortcuts" aria-label="Akses cepat member">'+
        '<header class="ngd-member-section-head"><div><p class="eyebrow">AKSI CEPAT</p>'+
          '<h2>Lanjutkan pekerjaan</h2></div></header>'+
        '<div class="ngd-member-shortcut-grid">'+[
          ['spark','Studio AI','ai'],['clipboard','Pesanan','pesanan'],
          ['store','Katalog & Jasa','katalog']].map(x=>
          '<button type="button" class="ngd-member-shortcut" data-route="'+x[2]+'">'+
            '<span class="ngd-member-shortcut-icon">'+icon(x[0])+'</span>'+
            '<strong>'+x[1]+'</strong>'+icon('arrow')+'</button>').join('')+'</div>'+
      '</section>'+
      '<section class="ngd-member-activity" aria-label="Riwayat aktivitas terbaru">'+
        '<header class="ngd-member-section-head"><div><p class="eyebrow">RIWAYAT TERBARU</p>'+
          '<h2>Aktivitas akun</h2></div>'+
          '<button type="button" data-route="pesanan">Semua Pesanan '+icon('arrow')+'</button></header>'+
        (activities.length?'<ol class="ngd-member-activity-list">'+activities.map(x=>
          '<li><button type="button" data-route="'+x.route+'"><span><strong>'+
            esc(x.label)+'</strong><small>'+esc(x.detail)+'</small></span>'+
            '<time>'+esc(friendlyDate(x.at))+'</time></button></li>').join('')+'</ol>':
          '<p class="ngd-member-empty-activity">Belum ada aktivitas transaksi atau token yang tercatat.</p>')+
      '</section>'+
      (d.peringatan_kredit?'<p class="ngd-member-credit-notice">Saldo token hampir habis. Periksa sebelum menjalankan Studio AI.</p>':'')+
    '</div>';
  }

  // The buyer-facing home is a compact digital storefront; no synthetic
  // orders, prices, ratings or affiliate earnings are rendered here.
  // Public front door: concise value proposition, without a duplicate product grid.
  // The full catalog owns product cards, prices, filtering and checkout.
  // Guest-only landing; member and admin rendering above remains untouched.
  const landingCards=[
    {route:'ai',tag:'STUDIO AI',name:'Coba Tools AI Seperlunya',desc:'Lagi buntu cari ide konten? Coba buat caption, konsep promosi, atau naskah video. Kreditnya dipakai saat Anda menggunakan tools.',img:'ngd-v8-ai-large.webp',alt:'Visual paket alat bantu AI'},
    {route:'katalog',tag:'PRODUK DIGITAL',name:'Produk Siap Dipakai',desc:'Ada template, paket awal, katalog online, sampai kasir sederhana. Tinggal pilih yang cocok dengan cara kerja usaha Anda.',img:'ngd-v6-pos.webp',alt:'Visual produk sistem kasir digital'},
    {route:'jasa',tag:'BENGKEL KREATIF',name:'Butuh Dibantu? Bisa.',desc:'Nggak sempat bikin sendiri? Kami bisa bantu urus video promosi, website katalog, atau pekerjaan berulang di Google Sheets.',img:'ngd-v6-video.webp',alt:'Visual jasa pembuatan video promosi'},
    {route:'affiliate',tag:'AJAK TEMAN',name:'Ajak Teman, Dapat Komisi',desc:'Kalau ada teman yang cocok dengan layanan di sini, bagikan link Anda. Komisi dihitung dari pembelian yang sah, sesuai aturan program.',img:'ngd-v6-bundle.webp',alt:'Visual koleksi produk digital'}
  ];
  return `<div class="ngd-landing-v1">
    <section class="ngdl-hero" aria-labelledby="ngdl-title">
      <div class="ngdl-hero-copy">
        <p class="ngdl-eyebrow"><span class="ngdl-spark" aria-hidden="true">✦</span> TOOLS AI, PRODUK DIGITAL & JASA KREATIF</p>
        <h1 id="ngdl-title">Punya usaha? <span>Ngulik digitalnya</span> di sini aja.</h1>
        <p class="ngdl-hero-lead">Bikin konten jualan, coba AI, atau rapikan usaha? Di sini ada alat, produk, dan orang yang bisa bantu. Bisa dari HP juga.</p>
        <div class="ngdl-actions">
          <button type="button" class="ngdl-btn ngdl-btn-gold" data-route="katalog">Lihat Produk & Layanan <span aria-hidden="true">↗</span></button>
          <button type="button" class="ngdl-btn ngdl-btn-ghost" data-route="daftar">Masuk atau Daftar</button>
        </div>
      </div>
    </section>
    <div class="ngdl-trust" aria-label="Cara pakai Ngulik Digital">
      <span>✦ Tools AI pakai kredit</span><span>✦ Bayar dengan QRIS DANA Bisnis</span><span>✦ Bisa dibuka lewat HP</span><span>✦ Ada komisi untuk referal yang berhasil</span>
    </div>
    <section class="ngdl-story" aria-labelledby="ngdl-story-title">
      <p class="ngdl-kicker">KENAPA NGULIK DIGITAL?</p>
      <h2 id="ngdl-story-title">Urusan digital, nggak harus bikin repot.</h2>
      <p>Mau bikin konten, katalog, atau coba AI tapi waktunya mepet? Di sini ada alat yang bisa dipakai seperlunya, produk yang sudah siap, dan bantuan kalau ingin terima beres.</p>
    </section>
    <section class="ngdl-offers" aria-labelledby="ngdl-offers-title">
      <div class="ngdl-section-top"><div><p class="ngdl-kicker">ISI WARUNGNYA</p><h2 id="ngdl-offers-title">Cari yang pas buat Anda.</h2></div><p>Mulai dari satu hal yang sedang dibutuhkan.</p></div>
      <div class="ngdl-grid">${landingCards.map(c=>`<article class="ngdl-offer">
        <div class="ngdl-offer-image"><img src="./assets/media/${c.img}" loading="lazy" decoding="async" alt="${c.alt}"></div>
        <div class="ngdl-offer-body"><p class="ngdl-offer-tag">${c.tag}</p><h3>${c.name}</h3><p>${c.desc}</p>
        <button type="button" data-route="${c.route}" class="ngdl-offer-link">Lihat selengkapnya <span aria-hidden="true">↗</span></button></div>
      </article>`).join('')}</div>
    </section>
    <section class="ngdl-benefits" aria-labelledby="ngdl-benefits-title">
      <div><p class="ngdl-kicker">KALAU JADI MEMBER</p><h2 id="ngdl-benefits-title">Lebih mudah cari yang Anda perlukan.</h2></div>
      <ul><li><strong>Pesan tanpa pindah-pindah tempat.</strong> Pilih produk, cek rincian, lalu bayar lewat halaman checkout.</li><li><strong>Nggak harus buka laptop.</strong> Katalog dan ruang member bisa diakses dari browser HP.</li><li><strong>Pembelian tercatat.</strong> Akses produk diberikan setelah pembayaran terverifikasi, sesuai ketentuan masing-masing.</li><li><strong>Belum mau beli?</strong> Coba baca eBook atau ikut kelas gratis lebih dulu.</li></ul>
    </section>
    <section class="ngdl-end" aria-labelledby="ngdl-end-title">
      <h2 id="ngdl-end-title">Mau mulai ngulik?</h2>
      <p>Lihat katalognya dulu, atau masuk kalau sudah punya pilihan.</p>
      <div class="ngdl-actions"><button type="button" data-route="daftar" class="ngdl-btn ngdl-btn-gold">Masuk / Daftar <span aria-hidden="true">↗</span></button><button type="button" data-route="katalog" class="ngdl-btn ngdl-btn-ghost">Lihat Katalog</button></div>
      <nav class="ngdl-free" aria-label="Materi gratis"><a href="${NGD_FREE_EBOOK_URL}" target="_blank" rel="noopener noreferrer">Baca eBook Gratis ↗</a><a href="${NGD_FREE_CLASSROOM_URL}" target="_blank" rel="noopener noreferrer">Ikut Kelas Gratis ↗</a></nav>
    </section>
  </div>`;
}
const offerCategories=[
  ['semua','Semua Produk'],['belajar','eBook & Panduan'],
  ['starter','Paket Starter'],['aplikasi','Sistem & Aplikasi'],
  ['video','Video & AI'],['integrasi','Integrasi & Otomasi'],
  ['ai','Token AI'],['jasa','Layanan']
];
function ngdOfferInCategory_(p,category) {
  const id=String(p.product_id||'').toUpperCase();
  if(category==='starter')return id.startsWith('P-STARTER');
  if(category==='video')return id==='P-VIDEO-AI'||id.includes('VIDEO');
  if(category==='integrasi')return id.startsWith('P-INTEGRASI');
  return category==='semua'||offerCategory(p)===category;
}
function ngdOfferCategoryLabel_(p){
  const id=String(p.product_id||'').toUpperCase();
  return id.startsWith('P-STARTER')?'Paket Starter':
    id==='P-VIDEO-AI'?'Video & AI':
    id.startsWith('P-INTEGRASI')?'Integrasi & Otomasi':
    id==='P-POS'?'Sistem POS':offerCategoryLabel(p);
}
function ngdCommissionLabel_(p){
  if(p.bisa_komisi!==true)return '';
  const fixed=Number(p.komisi_nominal_tetap||0);
  if(Number.isSafeInteger(fixed)&&fixed>0)return 'Komisi '+rupiah(fixed);
  const percent=Number(p.komisi_persen||0);
  return Number.isInteger(percent)&&percent>0&&percent<=50?
    'Komisi '+percent+'%':'';
}
const supportedSaleTypes=new Set(['LANGGANAN_30H','LISENSI_SEKALI','SEAT_30H','TOPUP_TOKEN','TOPUP_KREDIT','PRODUK_DIGITAL','JASA_SEKALI']);
function offerCategory(p){
  switch(String(p.tipe||'')){
    case 'LANGGANAN_30H':case 'LISENSI_SEKALI':return 'aplikasi';
    case 'TOPUP_TOKEN':case 'TOPUP_KREDIT':return 'ai';
    case 'JASA_SEKALI':case 'SEAT_30H':return 'jasa';
    case 'PRODUK_DIGITAL':return 'belajar';
    default:return 'lainnya';
  }
}
const offerCategoryLabel=p=>{
  const category=offerCategory(p);
  return offerCategories.find(x=>x[0]===category)?.[1]||'Produk digital';
};
/* Public marketplace presentation only. Commerce decisions reuse the existing
 * verified catalog, availability and checkout rules; no invented discounts. */
const offerUiTitle_=p=>String(p?.nama||'Produk');
const offerUiDescription_=p=>String(p?.deskripsi||'');
const isPublicQaOffer_=p=>
  String(p?.product_id||'')==='P-B36AA0054926'||
  String(p?.sumber_produk||'').toUpperCase()==='QA_STAGING_TEST'||
  /^\s*\[(?:ARCHIVED|ARSIP|QA)\]/i.test(String(p?.nama||''));

/* Local editorial cover artwork is a safe fallback when a CMS PRODUCT_IMAGE
 * has not been published. Product price, availability and checkout remain
 * exclusively sourced from the existing catalog/backend. */
function ngdProductArtId_(p,kind){
  // One visual inventory for all active SKUs; long labels stay in HTML.
  // No seller prices, commissions, or claims are embedded in image assets.
  const id=String(p?.product_id||'').toUpperCase();
  const title=String(p?.nama||'').toLocaleLowerCase('id-ID');
  if(id==='P-EBOOK'||/vibe coder|bundel ebook/.test(title))return 'ebook';
  if(id.startsWith('P-STARTER'))return 'starter';
  if(id==='P-3IN1'||/akselerasi umkm 3in1/.test(title))return 'bundle';
  if(id==='P-POS'||/sistem kasir|pos sederhana/.test(title))return 'pos';
  if(/supabase|webhook/.test(title)&&!/google sheets/.test(title))return 'supabase';
  if(id.startsWith('P-INTEGRASI')||/apps script|otomasi google sheets/.test(title))return 'gas';
  if(id==='P-VIDEO-AI'||/video promosi ai siap/.test(title))return 'video';
  if(/kelas private|ternak akun youtube/.test(title))return 'youtube';
  if(id.startsWith('P-CLASS')||/google classroom|kelas gratis/.test(title))return 'class';
  if(/canva/.test(title))return 'canva';
  if(/template webapp|template.*konten/.test(title))return 'templates';
  if(id.startsWith('P-TOKEN')||id.startsWith('P-KREDIT')||
      /top-up|token ai|kredit ai/.test(title)){
    const num=Number((title.match(/(?:top-up|isi ulang)\s*(\d+)/)||[])[1]||0);
    if(num>=150)return 'ai-large';
    if(num>=25)return 'ai-pack';
    return 'ai-small';
  }
  if(id.startsWith('P-KIT'))return 'templates';
  if(id.startsWith('P-CANVA'))return 'canva';
  return ({ai:'ai-small',aplikasi:'pos',jasa:'video',belajar:'ebook'})[kind]||'templates';
}
function ngdLocalArtSrc_(name){
  const root=String(window.location?.pathname||'').includes('/staging/')?'../':'./';
  return root+'assets/media/ngd-cover-'+name+'.svg';
}
function ngdPremiumArtSrc_(name){
  const root=String(window.location?.pathname||'').includes('/staging/')?'../':'./';
  const v8=new Set(['ai-small','ai-pack','ai-large','templates','canva',
    'code','class','youtube','supabase','pos','video','gas']);
  if(v8.has(name))return root+'assets/media/ngd-v8-'+name+'.webp';
  const v6=new Set(['hero','ebook','starter','bundle','integrasi']);
  return v6.has(name)?root+'assets/media/ngd-v6-'+name+'.webp':
    ngdLocalArtSrc_(name);
}
function ngdProductImageFallback_(p,kind){
  const name=ngdProductArtId_(p,kind);
  return '<img class="market-product-image ngd-product-cover" src="'+esc(ngdPremiumArtSrc_(name))+
    '" alt="Sampul '+esc(offerUiTitle_(p))+'" loading="lazy" decoding="async">';
}

function viewPublicMarketplace(list){
  const publicList=list.filter(p=>!isPublicQaOffer_(p));
  const options=arguments[1]||{};
  const category=options.category??(state.catalogFilter||'semua');
  const search=String(options.search??state.marketplaceSearch??'').trim().toLocaleLowerCase('id-ID');
  const sort=options.sort??(state.marketplaceSort||'default');
  const showCampaign=options.showCampaign!==false;
  const memberMode=options.memberMode===true;
  let shown=publicList.filter(p=>ngdOfferInCategory_(p,category)&&
    (!search||String(p.nama||'').toLocaleLowerCase('id-ID').includes(search)||
      String(p.deskripsi||'').toLocaleLowerCase('id-ID').includes(search)||
      ngdOfferCategoryLabel_(p).toLocaleLowerCase('id-ID').includes(search)));
  // Prices may arrive as "Rp99.000" from Sheets; sort with the same safe parser used by checkout.
  if(sort==='price-asc')shown=[...shown].sort((a,b)=>(moneyValue(a.harga)??Number.POSITIVE_INFINITY)-(moneyValue(b.harga)??Number.POSITIVE_INFINITY));
  if(sort==='price-desc')shown=[...shown].sort((a,b)=>(moneyValue(b.harga)??Number.NEGATIVE_INFINITY)-(moneyValue(a.harga)??Number.NEGATIVE_INFINITY));
  if(sort==='name')shown=[...shown].sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
  // Admin HERO/catalog content is authoritative. The baked-in visual is a
  // reliable fallback when a catalog campaign has not been published yet.
  const banner=window.NGD_CONTENT_UI?.catalogBanner(state.siteContent)||
    '<section class="ngd-catalog-campaign" data-catalog-banner-source="default">'+
      '<div class="ngd-catalog-campaign-viewport"><article class="ngd-catalog-campaign-slide">'+
      '<div class="ngd-catalog-campaign-picture"><img src="'+esc(ngdPremiumArtSrc_('templates'))+'" alt=""></div>'+
      '<div class="ngd-catalog-campaign-copy">'+
      '<p class="ngd-catalog-campaign-kicker">NGULIK DIGITAL · MARKETPLACE PRODUK DIGITAL</p>'+
      '<h2>Produk digital untuk belajar dan mengembangkan usaha.</h2>'+
      '<p class="ngd-catalog-campaign-description">Jelajahi solusi digital yang sesuai kebutuhan Anda.</p>'+
      '<div class="ngd-catalog-campaign-actions"><button type="button" class="ngd-catalog-campaign-cta" data-market-browse>Jelajahi Produk</button></div>'+
      '</div></article></div></section>';
  const filterBar='<div class="market-categories" role="group" aria-label="Jelajahi kategori produk">'+
    offerCategories.map(([id,label])=>'<button type="button" class="catalog-filter market-category" data-catalog-filter="'+esc(id)+
      '" aria-pressed="'+(id===category?'true':'false')+'"><span class="market-category-icon" aria-hidden="true">'+
      ({semua:'▦',ai:'✦',aplikasi:'▣',jasa:'◈',belajar:'▤',starter:'↗',video:'▷',integrasi:'⌘'}[id]||'•')+'</span>'+esc(label)+'</button>').join('')+'</div>';
  const controls='<div class="market-toolbar"><label class="market-search-wrap" for="market-search">'+
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>'+
    '<input id="market-search" type="search" placeholder="Cari produk atau jasa..." autocomplete="off" value="'+esc(state.marketplaceSearch||'')+'" aria-label="Cari produk digital">'+
    '</label><label class="market-sort-wrap">Urutkan <select id="market-sort" aria-label="Urutkan produk">'+
    [['default','Relevan'],['name','Nama A–Z'],['price-asc','Harga terendah'],['price-desc','Harga tertinggi']].map(([v,t])=>
      '<option value="'+v+'" '+(sort===v?'selected':'')+'>'+t+'</option>').join('')+
    '</select></label></div>';
  const cards=shown.map(p=>{
    const kind=offerCategory(p);
    const price=moneyValue(p.harga);
    // Every catalog item opens the same internal checkout details first.
    // No WhatsApp commerce CTA, no direct money movement on card click.
    const detailAction=logged()?
      '<button type="button" class="ngd-card-detail" data-checkout-product="'+idSafe(p.product_id)+'">Detail checkout</button>':
      '<details class="ngd-card-public-detail"><summary>Detail produk</summary>'+
        '<p>'+esc(offerUiDescription_(p)||'Lihat informasi produk dan harga sebelum membeli.')+'</p>'+
        '<strong>'+rupiah(price)+'</strong></details>';
    const action='<div class="ngd-card-actions">'+detailAction+
      '<button type="button" class="market-product-action" data-checkout-product="'+idSafe(p.product_id)+'">'+
      (price===0?'Akses Gratis':'Beli Sekarang')+' '+icon('arrow')+'</button></div>';
    // Optional short badge is owned by the published PRODUCT_IMAGE CMS entry.
    // Long descriptions are never converted into tiny marketing labels.
    const imageEntry=window.NGD_CONTENT_UI?.published(state.siteContent,'PRODUCT_IMAGE',p.product_id)?.[0];
    const badgeText=String(imageEntry?.description||'').trim();
    const customBadge=badgeText.length<=24&&badgeText.split(/\s+/).length<=4?badgeText:'';
    const badge=customBadge|| (price===0?'Gratis':
      Number(p.durasi_hari)>0?esc(Number(p.durasi_hari))+' hari':
      String(p.tipe)==='LISENSI_SEKALI'?'Sekali bayar':
      ['TOPUP_KREDIT','TOPUP_TOKEN'].includes(String(p.tipe))?'Isi Token':'');
    const benefits=(Number(p.kredit_diberikan)>0?'<span>'+esc(Number(p.kredit_diberikan))+' token</span>':'')+
      (Number(p.durasi_hari)>0?'<span>'+esc(Number(p.durasi_hari))+' hari akses</span>':'');
    const fallbackCover=ngdProductImageFallback_(p,kind);
    const cmsImage=window.NGD_CONTENT_UI?.media(state.siteContent,'PRODUCT_IMAGE',p.product_id,
      'market-product-image',offerUiTitle_(p));
    // Editors can publish a custom product image; if its URL fails, recover
    // to a stable locally deployed cover instead of exposing broken alt text.
    const localSource=ngdPremiumArtSrc_(ngdProductArtId_(p,kind));
    const cover=cmsImage?cmsImage.replace('<img ',
      '<img data-market-fallback="'+esc(localSource)+'" '):fallbackCover;
    const commissionLabel=ngdCommissionLabel_(p);
    return '<article class="market-product-card" data-market-kind="'+esc(kind)+'" aria-label="'+esc(offerUiTitle_(p))+'">'+
      '<div class="market-product-media market-media-'+esc(kind)+'">'+
        (cover||fallbackCover)+
        (badge?'<span class="market-product-badge">'+esc(badge)+'</span>':'')+
        '<span class="market-product-category">'+esc(offerCategoryLabel(p))+'</span>'+
      '</div><div class="market-product-body">'+
        '<span class="market-product-merchant">'+esc(ngdOfferCategoryLabel_(p))+'</span>'+
        '<h3>'+esc(offerUiTitle_(p))+'</h3>'+
        '<p class="market-product-description">'+esc(offerUiDescription_(p)||'Lihat pilihan produk digital kami.')+'</p>'+
        (benefits?'<div class="market-product-benefits">'+benefits+'</div>':'')+
        '<div class="market-product-bottom"><span class="market-product-price-label">Harga</span>'+
        '<div class="ngd-market-price-row"><strong class="market-product-price">'+
          (price===0?'Gratis':price!==null&&price>0?rupiah(p.harga):'Harga belum tersedia')+'</strong>'+
          (commissionLabel?'<span class="ngd-market-commission">'+esc(commissionLabel)+'</span>':'')+
        '</div>'+action+'</div>'+
      '</div></article>';
  }).join('');
  return '<div class="market-page">'+
    '<header class="market-header"><div><p class="market-eyebrow">NGULIK DIGITAL / PILIHAN UNTUK USAHA</p>'+
    '<h1>'+(memberMode?'Katalog untuk kebutuhan Anda':'Katalog Produk & Jasa')+'</h1><p>'+(memberMode?'Bandingkan pilihan, cek detail manfaat, lalu beli sesuai kebutuhan.':'Cari solusi yang cocok, lihat harga, dan pilih langkah berikutnya.')+'</p></div>'+
    '</header>'+
    (showCampaign?'<div class="market-banner-shell">'+banner+'</div>':'')+
    '<section class="market-shopping" id="market-shopping" aria-label="Belanja produk digital">'+
      controls+filterBar+
      '<div class="market-results-header"><h2>'+(memberMode?'Pilihan Produk & Layanan':'Jelajahi Produk')+'</h2><span aria-live="polite">'+shown.length+' dari '+publicList.length+' produk</span>'+
      '<button type="button" class="market-refresh" data-market-refresh aria-label="Perbarui katalog">Perbarui</button></div>'+
      (cards?'<div class="market-product-grid">'+cards+'</div>':
        '<div class="market-no-results"><h3>Produk Tidak Ditemukan</h3><p>Coba kata kunci atau kategori lain.</p>'+
        '<button type="button" data-market-reset>Hapus filter</button></div>')+
    '</section>'+
    '<p class="market-trust-note">'+
      (config.paymentsEnabled===true?'Pembayaran diproses setelah verifikasi admin.':'Checkout produk tersedia. Pembayaran QRIS baru dibuka setelah verifikasi penerima resmi.')+'</p>'+
  '</div>';
}
function viewPartnerShelf_(){
  if(!logged()||isAdmin())return '';
  const rows=Array.isArray(state.partnerShelf)?state.partnerShelf:[];
  const cards=rows.filter(x=>urlSafe(x.link_affiliate)).map(x=>{
    const href=urlSafe(x.link_affiliate);
    // External partner links are NEVER routed through internal checkout.
    const thumb=urlSafe(x.gambar_url);
    return '<article class="ngd-partner-card">'+
      (thumb?'<img class="ngd-partner-thumb" src="'+esc(thumb)+'" alt="" loading="lazy" decoding="async">':
        '<span class="ngd-partner-card-icon">'+icon('book')+'</span>')+
      '<p class="eyebrow">KELAS & ALAT PILIHAN</p>'+
      '<h3>'+esc(x.judul||'Rekomendasi pilihan')+'</h3>'+
      '<p>'+esc(x.deskripsi_singkat||x.alasan_rekomendasi||'Lihat detail di situs penyedia.')+'</p>'+
      '<small>'+esc(x.harga_info||'Lihat ketentuan pada penyedia')+'</small>'+
      '<a class="btn btn-secondary" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" data-partner-out="'+esc(x.item_id||'')+'">Buka tautan '+icon('arrow')+'</a>'+
    '</article>';
  }).join('');
  return '<section class="ngd-partner-shelf section-gap" id="etalase-rekomendasi" aria-label="Etalase Rekomendasi Kelas dan Tools Partner">'+
    '<div class="ngd-partner-header"><div><p class="eyebrow">REKOMENDASI</p><h2>Kelas & Alat Pilihan</h2>'+
    '<p>Lihat detail dan ketentuan di situs penyedia.</p></div>'+
    '<span class="ngd-partner-disclosure">Tautan mitra</span></div>'+
    (cards?'<div class="ngd-partner-grid">'+cards+'</div>':
      '<p class="ngd-partner-empty">'+(state.partnerShelfLoaded?'Belum ada rekomendasi.':'Memuat rekomendasi…')+'</p>')+
  '</section>';
}
function viewCatalog(){
  // One catalog presentation for guests and signed-in members.
  // Existing server-side payment and role gates remain authoritative.
  const list=Array.isArray(state.catalog)?state.catalog.filter(p=>!isPublicQaOffer_(p)):[];
  const storefront=viewPublicMarketplace(list,{showCampaign:!logged()&&!isAdmin(),memberMode:logged()&&!isAdmin()});
  if(!logged()||isAdmin())return storefront;
  const access='<details class="market-member-access"><summary>Akses layanan saya</summary>'+
    '<div class="market-member-access-list">'+[
      ['POS Kasir',state.me?.status_pos||'Belum aktif'],
      ['Paket 3-in-1',state.me?.akses_3in1_sampai&&new Date(state.me.akses_3in1_sampai).getTime()>Date.now()?'Aktif':'Belum aktif'],
      ['Canva',state.me?.status_canva||'Belum aktif']
    ].map(([name,status])=>'<span><strong>'+esc(name)+'</strong><small>'+esc(status)+'</small></span>').join('')+'</div></details>';
  return '<div class="ngd-member-catalog">'+
    '<header class="ngd-member-page-intro"><div><p class="eyebrow">RUANG MEMBER / BELANJA</p><h1>Temukan kebutuhan berikutnya.</h1>'+
    '<p>Pilih produk dan layanan untuk usaha Anda. Akses yang sudah dimiliki tetap bisa diperiksa di bawah.</p></div>'+
    '<button type="button" class="btn btn-secondary" data-route="pesanan">Pesanan Saya '+icon('arrow')+'</button></header>'+
    access+storefront+viewPartnerShelf_()+'</div>';
}
function viewLearn(){
  if(window.NGD_LMS_UI&&logged())
    return window.NGD_LMS_UI.memberCatalog(state.lmsCourses,state.lmsEnrollments,state.modules);
  if(!logged())return '<div class="ngd-learning-public">'+
    '<section class="ngd-purpose-hero ngd-purpose-hero--learn" aria-label="Belajar gratis Ngulik Digital">'+
      '<div class="ngd-purpose-copy"><p class="eyebrow">BELAJAR · NGULIK DIGITAL</p>'+
      '<h1>Belajar keterampilan digital, mulai dari yang praktis.</h1>'+
      '<p>Mulai dengan eBook dan kelas pengantar gratis. Pelajari langkah yang bisa langsung dicoba untuk usaha dan karya Anda.</p>'+
      '<div class="ngd-purpose-actions">'+
        '<a class="btn btn-primary" href="'+NGD_FREE_EBOOK_URL+'" target="_blank" rel="noopener noreferrer">Baca eBook Gratis '+icon('arrow')+'</a>'+
        '<a class="btn btn-secondary" href="'+NGD_FREE_CLASSROOM_URL+'" target="_blank" rel="noopener noreferrer">Buka Kelas Gratis</a>'+
      '</div></div>'+
      '<div class="ngd-purpose-media"><img src="'+esc(cmsPageArt_('belajar')||ngdPremiumArtSrc_('class'))+'" alt="Ilustrasi materi belajar digital" loading="lazy" decoding="async"></div>'+
    '</section><section class="ngd-learning-path"><p class="eyebrow">LANGKAH BELAJAR</p><h2>Mulai dengan tiga langkah sederhana</h2>'+
    '<div class="ngd-learning-steps"><article><span>01</span><strong>Baca panduan</strong><p>Kenali konsep dan contoh sederhana.</p></article>'+
    '<article><span>02</span><strong>Ikuti kelas</strong><p>Praktikkan materi sesuai kebutuhan.</p></article>'+
    '<article><span>03</span><strong>Kembangkan karya</strong><p>Jelajahi produk dan alat pendukung.</p></article></div></section></div>';
  const modules=state.modules;
  return title('Kelas & Materi Anda','PILIHAN KELAS','Pilih materi yang ingin Anda pelajari.')+
    (modules.length?'<div class="stack">'+modules.map((m,i)=>'<article class="surface list-row"><div class="left" style="display:flex;gap:15px;align-items:center"><span class="step-no">'+esc(m.urut||i+1)+'</span><div><strong>'+esc(m.judul)+'</strong><small>'+esc(m.deskripsi||'')+'</small></div></div>'+
    (classroomUrlSafe(m.url_classroom)?'<a class="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer" href="'+esc(classroomUrlSafe(m.url_classroom))+'">Buka materi '+icon('arrow')+'</a>':
    '<span class="chip">Materi menyusul</span>')+'</article>').join('')+'</div>':
    empty('Materi belum tersedia','Materi baru akan muncul di sini.'));
}
// Studio AI is a demand-led catalogue. Tool availability and price always
// come from getTools; categories without published wrappers never imply access.
const aiCategoryCatalog=[
  {id:'umkm',title:'Kebutuhan UMKM',short:'UMKM',icon:'store',
   detail:'Produk, promosi, layanan pelanggan, dan operasional usaha.',
   examples:'Caption jualan · Deskripsi produk · Balasan pelanggan'},
  {id:'affiliate',title:'Ide Bagikan Produk',short:'Komisi',icon:'link',
   detail:'Materi promosi, ulasan produk, dan ide kampanye ajak teman.',
   examples:'Naskah review · Hook promosi · Ide konten komisi'},
  {id:'media',title:'Kebutuhan Media',short:'Media',icon:'grid',
   detail:'Riset, editorial, produksi berita, dan publikasi.',
   examples:'Ringkasan liputan · Judul editorial · Naskah publikasi'},
  {id:'edukasi',title:'Guru & Edukasi',short:'Edukasi',icon:'book',
   detail:'Perencanaan pembelajaran, materi kelas, dan latihan.',
   examples:'Rencana ajar · Lembar kerja · Kuis'},
  {id:'kreator',title:'Konten Kreator',short:'Kreator',icon:'spark',
   detail:'Ide, skrip, storytelling, dan produksi konten digital.',
   examples:'Ide video · Skrip pendek · Kalender konten'}
];
function aiToolCategory_(tool){
  const explicit=String(tool.kategori||tool.category||'').trim().toLowerCase();
  const aliases={bisnis:'umkm',usaha:'umkm',marketing:'affiliate',creator:'kreator',
    konten:'kreator',guru:'edukasi',pendidikan:'edukasi'};
  const normalized=aliases[explicit]||explicit;
  if(aiCategoryCatalog.some(c=>c.id===normalized))return normalized;
  const name=String(tool.nama||'').toLowerCase();
  const id=String(tool.tool_id||'').toLowerCase();
  const words=name+' '+id;
  // Stable mapping for the 12 STAGING tools (no schema/header change).
  const fixed={
    'T-CAPTION':'umkm','T-DESKRIPSI':'umkm','T-BALASAN':'umkm',
    'T-KONTEN7':'umkm','T-SKRIP-VIDEO':'kreator','T-BUNDLING':'umkm',
    'T-AFF-REVIEW':'affiliate','T-AFF-BONUS':'affiliate',
    'T-MEDIA-ARTIKEL':'media','T-GURU-MODUL':'edukasi',
    'T-KREATOR-YT':'kreator','T-UMKM-MAPS':'umkm'
  };
  if(fixed[String(tool.tool_id||'').toUpperCase()])return fixed[String(tool.tool_id||'').toUpperCase()];
  if(/guru|kelas|kuis|ajar|pendidikan|sekolah|murid/.test(words))return 'edukasi';
  if(/affiliate|afiliasi|referral|komisi|review produk/.test(words))return 'affiliate';
  if(/berita|jurnal|liputan|redaksi|media|press release/.test(words))return 'media';
  if(/kreator|creator|youtube|podcast|storyboard|skrip video|shorts|reels/.test(words))return 'kreator';
  return 'umkm';
}
const aiCategoryFor_=id=>aiCategoryCatalog.find(c=>c.id===id);
function aiToolRoute_(toolId){return 'ai-tool/'+encodeURIComponent(String(toolId||''));}
function aiRouteFromHash_(){
  const hash=location.hash.slice(1);
  if(hash.startsWith('checkout/')){
    try{
      const id=decodeURIComponent(hash.slice('checkout/'.length));
      if(/^[A-Za-z0-9_-]{1,100}$/.test(id)){
        state.checkoutProductId=id;state.lastOrder=null;
        state.checkoutReturnRoute='katalog';return 'checkout';
      }
    }catch(_){}
    return 'katalog';
  }
  if(hash.startsWith('ai-tool/')){
    const encoded=hash.slice(8);
    try{const toolId=decodeURIComponent(encoded);
      if(/^[A-Za-z0-9_-]{1,100}$/.test(toolId)){state.selectedAiToolId=toolId;return 'ai-tool';}
    }catch(_){}
    return 'ai';
  }
  return screens[hash]?hash:'beranda';
}
function aiCategoryNav_(tools,publicMode){
  const current=state.aiCategory||'semua';
  return '<div class="ai-category-tabs" role="group" aria-label="Kategori kebutuhan Studio AI">'+
    '<button type="button" class="ai-category-tab'+(current==='semua'?' is-current':'')+
    '" data-ai-category="semua" aria-pressed="'+(current==='semua')+'">Semua</button>'+
    aiCategoryCatalog.map(c=>{
      const count=tools.filter(t=>aiToolCategory_(t)===c.id).length;
      return '<button type="button" class="ai-category-tab'+(current===c.id?' is-current':'')+
        '" data-ai-category="'+c.id+'" aria-pressed="'+(current===c.id)+'">'+
        esc(c.short)+(count?' <span>'+count+'</span>':'')+'</button>';
    }).join('')+'</div>';
}
function aiCategoryOverview_(tools){
  const active=state.aiCategory||'semua';
  return '<section class="ai-category-overview" aria-label="Jelajahi kebutuhan">'+
    aiCategoryCatalog.filter(c=>active==='semua'||c.id===active).map(c=>{
      const count=tools.filter(t=>aiToolCategory_(t)===c.id).length;
      return '<button type="button" class="ai-category-card'+(active===c.id?' is-active':'')+
        '" data-ai-category="'+c.id+'"><span class="ai-category-card-icon">'+icon(c.icon)+'</span>'+
        '<span class="ai-category-card-copy"><strong>'+esc(c.title)+'</strong>'+
        '<small>'+esc(c.detail)+'</small><em>'+esc(c.examples)+'</em></span>'+
        '<span class="ai-category-card-end">'+(count?esc(count)+' alat tersedia':'Ruang pengembangan')+
        icon('arrow')+'</span></button>';
    }).join('')+'</section>';
}
function viewAI(){
  const tools=logged()&&!isAdmin()&&state.tools.length?state.tools:(Array.isArray(state.publicTools)?state.publicTools:[]);
  const category=state.aiCategory||'semua';
  const search=String(state.aiSearch||'').trim().toLocaleLowerCase('id-ID');
  const filtered=tools.filter(t=>(category==='semua'||aiToolCategory_(t)===category)&&
    (!search||[t.nama,t.deskripsi,t.tool_id,aiCategoryFor_(aiToolCategory_(t))?.title]
      .some(v=>String(v||'').toLocaleLowerCase('id-ID').includes(search))));
  const balance=Number(state.home?.saldo_kredit??state.me?.saldo_kredit??0);
  const publicMode=!logged()||isAdmin();
  const intro='<header class="ai-catalog-intro"><div class="ai-catalog-intro-copy">'+
    '<p class="eyebrow">'+(publicMode?'JELAJAH PUBLIK / STUDIO AI':'RUANG MEMBER / STUDIO AI')+'</p><h1>'+(publicMode?'Kenali alat AI untuk pekerjaan nyata.':'Pilih alat. Mulai berkarya.')+'</h1>'+
    '<p>'+(publicMode?'Jelajahi alat untuk menulis, merencanakan konten, dan mendukung pekerjaan usaha. Masuk sebagai member untuk menjalankannya.':'Pilih alat, periksa kebutuhan token, lalu mulai bekerja dari satu tempat.')+'</p></div>'+
    (publicMode?'<img class="ngd-ai-hero-art" src="'+esc(cmsPageArt_('ai')||ngdPremiumArtSrc_('ai-pack'))+'" alt="" loading="lazy" decoding="async">':'')+
    (!publicMode?'<div class="ai-wallet-mini"><small>Saldo</small><strong id="ai-balance">'+esc(balance)+' Token</strong>'+
    '<button type="button" data-catalog-go="ai">Isi Token</button></div>':'')+
    '</header>';
  const navigation=aiCategoryNav_(tools,publicMode);
  // Category chips are filters, not landing cards; show actual tool cards first.
  const cards='<section class="ai-tool-catalog" aria-labelledby="ai-tools-heading">'+
    '<div class="ai-tools-heading"><div><h2 id="ai-tools-heading">Pilih alat <span class="ai-tools-count">'+filtered.length+'</span></h2></div>'+
    '<label class="ai-search-wrap"><span class="sr-only">Cari alat AI</span>'+
    '<input id="ai-tool-search" type="search" placeholder="Cari alat AI" autocomplete="off" value="'+
    esc(state.aiSearch||'')+'" aria-label="Cari alat AI"></label></div>'+
    '<div class="ai-catalog-grid" id="ai-tool-cards">'+
      (filtered.length?filtered.map(t=>{
        const c=aiCategoryFor_(aiToolCategory_(t));
        return '<button type="button" class="ai-product-card" data-ai-open="'+idSafe(t.tool_id)+'" aria-label="Buka tool '+esc(t.nama)+'">'+
          '<span class="ai-product-icon">'+icon(c?.icon||'spark')+'</span>'+
          '<span class="ai-product-category">'+esc(c?.short||'AI')+'</span>'+
          '<strong>'+esc(t.nama)+'</strong>'+
          '<small>'+esc(t.deskripsi||'Alat AI untuk kebutuhan Anda.')+'</small>'+
          '<span class="ai-product-bottom"><span>'+esc(Number(t.kredit_biaya)||0)+' Token</span>'+
          '<span class="ai-product-action">Buka '+icon('arrow')+'</span></span>'+
        '</button>';
      }).join(''):'<div class="ai-catalog-empty"><strong>'+
        (!state.publicToolsLoaded&&tools.length===0?'Memuat katalog Studio AI…':'Belum ada tool pada pilihan ini.')+
        '</strong><p>'+(!state.publicToolsLoaded&&tools.length===0?
        'Daftar produk sedang dibaca dari sistem.':'Pilih kategori lain atau hapus kata kunci pencarian.')+'</p></div>')+
    '</div></section>';
  return '<div class="ai-catalog">'+intro+navigation+cards+
    (publicMode?'<div class="ai-catalog-access"><strong>Ingin menggunakan alat?</strong>'+
      '<button type="button" class="btn btn-primary" data-route="login">Masuk member '+icon('arrow')+'</button></div>':'')+'</div>';
}
// Each active wrapper has its own addressable workspace page (#ai-tool/ID).
// No client-side pricing or availability is invented: getTools is authoritative.
function viewAITool(){
  const tools=logged()&&!isAdmin()&&state.tools.length?state.tools:(Array.isArray(state.publicTools)?state.publicTools:[]);
  const selected=tools.find(t=>t.tool_id===state.selectedAiToolId);
  if(!selected)return '<div class="ai-tool-detail"><button class="ai-tool-back" type="button" data-route="ai">'+icon('arrow')+' Kembali ke daftar alat</button>'+
    '<div class="ai-catalog-empty"><strong>Alat Belum Tersedia</strong><p>Pilih alat lain dari daftar.</p></div></div>';
  const cost=Number(selected.kredit_biaya)||0,can=logged()&&!isAdmin()&&isWriteEnabled();
  const category=aiCategoryFor_(aiToolCategory_(selected));
  const balance=Number(state.home?.saldo_kredit??state.me?.saldo_kredit??0);
  if(!logged()||isAdmin())return '<div class="ai-tool-detail">'+
    '<nav class="ai-tool-breadcrumb"><button type="button" data-route="ai">Studio AI</button><span>/</span><strong>'+esc(selected.nama)+'</strong></nav>'+
    '<header class="ai-tool-detail-hero"><div class="ai-tool-detail-identity">'+
    '<span class="ai-product-icon">'+icon(category?.icon||'spark')+'</span>'+
    '<p class="eyebrow">'+esc(category?.title||'Studio AI')+'</p><h1>'+esc(selected.nama)+'</h1>'+
    '<p>'+esc(selected.deskripsi||'Alat AI untuk pekerjaan harian Anda.')+'</p>'+
    '<span class="ai-detail-cost">'+esc(cost)+' Token / proses</span></div></header>'+
    '<div class="ai-catalog-access"><strong>Masuk untuk mulai</strong>'+
    '<button type="button" class="btn btn-primary" data-route="login">Masuk member '+icon('arrow')+'</button></div></div>';
  return '<div class="ai-tool-detail"><nav class="ai-tool-breadcrumb" aria-label="Navigasi Studio AI">'+
    '<button type="button" data-route="ai">Studio AI</button><span>/</span><span>'+esc(category?.short||'Tool')+'</span><span>/</span><strong>'+esc(selected.nama)+'</strong></nav>'+
    '<header class="ai-tool-detail-hero"><div class="ai-tool-detail-identity">'+
    '<span class="ai-product-icon">'+icon(category?.icon||'spark')+'</span>'+
    '<p class="eyebrow">'+esc(category?.title||'STUDIO AI')+'</p>'+
    '<h1>'+esc(selected.nama)+'</h1><p>'+esc(selected.deskripsi||'Tulis kebutuhan Anda untuk mulai.')+'</p>'+
    '<span class="ai-detail-cost">'+esc(cost)+' Token per proses</span></div>'+
    '<div class="ai-wallet-mini"><small>SALDO TOKEN</small><strong id="ai-balance">'+esc(balance)+' Token</strong>'+
    '<button type="button" data-catalog-go="ai">+ Isi Token</button></div></header>'+
    '<div class="ai-tool-detail-content"><section class="ai-tool-brief">'+
    '<div class="ai-workspace-title"><h2>Isi Kebutuhan</h2></div>'+
    '<form class="ai-form" data-tool-id="'+idSafe(selected.tool_id)+'" data-cost="'+esc(cost)+'" novalidate>'+
    '<div class="field"><label class="ai-label" for="ai-business-name">Usaha / proyek <small>(opsional)</small></label>'+
    '<input class="input" id="ai-business-name" name="nama_usaha" maxlength="100" autocomplete="organization" value="'+
    esc(state.me?.nama_usaha||'')+'" placeholder="Nama usaha atau proyek"></div>'+
    '<div class="field"><label class="ai-label" for="ai-in-'+idSafe(selected.tool_id)+'">Ceritakan Kebutuhan</label>'+
    '<textarea class="input ai-input" id="ai-in-'+idSafe(selected.tool_id)+'" name="input" rows="7" maxlength="1500" required placeholder="'+
    esc(selected.placeholder_input||'Contoh: buat caption promosi untuk produk saya')+'"'+(can?'':' disabled')+'></textarea>'+
    '<small class="form-hint">Jangan masukkan data pribadi pelanggan.</small></div>'+
    '<div class="ai-foot"><span class="ai-cost"><strong>'+esc(cost)+' Token</strong> / eksekusi</span>'+
    '<button class="btn btn-primary" type="submit"'+(can?'':' disabled')+'>Buat Hasil '+icon('arrow')+'</button></div>'+
    (!can?'<p class="ai-workspace-notice">Alat ini belum bisa digunakan.</p>':'')+
    '<div class="ai-result" role="status" aria-live="polite" hidden></div></form></section>'+
    '</div></div>';
}
function aiWizardStep_(form,step){
  const root=form.closest?.('.ai-tool-detail');
  if(!root)return;
  const steps=root.querySelectorAll?.('.ai-wizard-progress li')||[];
  steps.forEach((item,index)=>{
    const number=index+1;
    item.classList.toggle('is-current',number===step);
    item.classList.toggle('is-complete',number<step);
  });
}
async function submitAITool(form){
  const btn=form.querySelector('[type=submit]'),box=form.querySelector('.ai-result'),area=form.querySelector('textarea');
  const detail=area.value.trim();
  const business=String(form.elements?.nama_usaha?.value||'').trim();
  const input=(business?'Nama usaha: '+business+'\n':'')+'Detail kebutuhan: '+detail;
  if(!detail){area.focus();return toast('Isi permintaan terlebih dahulu.',true);}
  if(input.length>1500)return toast('Teks terlalu panjang. Maksimal 1.500 karakter.',true);
  const cost=Number(form.dataset.cost)||0,saldo=Number(state.home?.saldo_kredit??state.me?.saldo_kredit??0);
  if(saldo<cost)return toast('Saldo tidak cukup. Isi token lewat Katalog.',true);
  aiWizardStep_(form,3);
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
    box.className='ai-result';box.innerHTML='<p class="card-kicker">HASIL · '+esc(r.kredit_terpakai)+' TOKEN DIPAKAI</p><div class="ai-text">'+esc(r.hasil)+'</div>'+
      '<div class="ai-result-actions"><button type="button" class="btn btn-secondary btn-sm" data-copy="'+esc(r.hasil)+'">Salin teks '+icon('link')+'</button>'+
      '<a class="btn btn-secondary btn-sm" href="https://wa.me/?text='+encodeURIComponent(String(r.hasil||''))+'" target="_blank" rel="noopener noreferrer">Kirim ke WA ↗</a></div>';
    box.scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(e){
    if(!['NETWORK_ERROR','INTERNAL','RECONCILIATION_REQUIRED'].includes(e.code))
      state.aiPending=null;
    aiWizardStep_(form,2);
    box.className='ai-result is-error';box.textContent=e.message||'AI gagal. Coba lagi.';
    if(e.code==='AI_FAILED')toast('Kredit Anda sudah dikembalikan.');
    try{const d=await api('getBeranda',{},state.token);state.home=d;const bal=document.getElementById('ai-balance');if(bal)bal.textContent=(d.saldo_kredit??0)+' kredit';}catch{}
  }finally{btn.disabled=false;area.disabled=false;}
}
function uiCommissionText_(value){
  return String(value||'').replace(/\b(?:affiliate|afiliator|afiliasi|referral|payout|tier)\b/gi,'komisi');
}
function viewAffiliate(){
  // Read-only presentation of the member's own backend-provided commission data.
  // Financial actions keep their existing client + server feature gates.
  if(!logged())return '<div class="partner-public">'+
    '<header class="partner-public-intro">'+
      '<img class="ngd-cms-affiliate-art" src="'+esc(cmsPageArt_('affiliate')||ngdPremiumArtSrc_('starter'))+'" alt="" loading="lazy" decoding="async">'+
      '<p class="partner-kicker">NGULIK DIGITAL · PROGRAM KOMISI</p>'+
      '<h1>Bagikan manfaat.<br><span>Dapatkan komisi.</span></h1>'+
      '<p>Rekomendasikan produk digital yang sesuai kebutuhan teman. Komisi hanya tercatat untuk transaksi yang memenuhi ketentuan.</p>'+
      '<div class="partner-hero-actions">'+
        (registrationOtpEnabled()?'<button type="button" class="partner-btn partner-btn-primary" data-route="daftar">Daftar Member '+icon('arrow')+'</button>':
        '<button type="button" class="partner-btn partner-btn-primary" data-route="katalog">Lihat Starter Pack '+icon('arrow')+'</button>')+
        '<button type="button" class="partner-btn partner-btn-outline" data-route="login">Sudah punya akun?</button>'+
      '</div><small>Gratis bergabung. Tidak ada jaminan penghasilan atau komisi untuk setiap klik.</small></header>'+
    '<section class="partner-steps-compact" aria-label="Cara kerja program komisi">'+
      [['01','Daftar','Buat akun member Ngulik Digital.'],
       ['02','Aktifkan','Beli Starter Pack dan tunggu verifikasi pembayaran.'],
       ['03','Bagikan','Setelah aktif, bagikan tautan dan pantau komisi yang memenuhi syarat.']].map(x=>
        '<article class="partner-step-compact"><span>'+x[0]+'</span><div><h2>'+x[1]+'</h2><p>'+x[2]+'</p></div></article>').join('')+'</section>'+
    '<section class="partner-pick-products"><div><p class="partner-kicker">MULAI DARI PRODUK YANG COCOK</p>'+
      '<h2>Punya rekomendasi untuk teman?</h2>'+
      '<p>Jelajahi katalog dan pilih solusi digital yang benar-benar relevan. Tidak semua produk memberikan komisi.</p></div>'+
      '<button type="button" class="partner-btn partner-btn-outline" data-route="katalog">Lihat katalog '+icon('arrow')+'</button></section>'+
    '<section class="partner-public-faq" aria-label="Pertanyaan umum tentang komisi">'+
      '<h2>Pertanyaan umum</h2>'+
      [['Komisi dihitung dari apa?','Komisi mengikuti pembelian yang memenuhi syarat dan ketentuan pada masing-masing produk.'],
       ['Kapan bisa dicairkan?','Setelah lolos verifikasi, masa tahan, dan batas minimum pencairan yang berlaku.'],
       ['Apakah satu klik langsung menghasilkan komisi?','Tidak. Klik dan pendaftaran tidak otomatis menghasilkan komisi.']].map(x=>
         '<details class="partner-faq-item"><summary>'+x[0]+'</summary><p>'+x[1]+'</p></details>').join('')+'</section>'+
    '<p class="partner-public-note">Program komisi tunduk pada ketentuan produk, status akun, dan verifikasi transaksi.</p>'+
  '</div>';

  if(isAdmin())return '<section class="partner-member partner-member-empty"><p class="partner-kicker">AKSES MEMBER</p>'+
    '<h1>Program Komisi</h1><p>Dashboard komisi pribadi hanya tersedia untuk akun member.</p>'+
    '<button type="button" class="partner-btn partner-btn-outline" data-route="admin">Kembali ke admin</button></section>';
  const a=state.affiliates;
  if(!a)return '<section class="partner-member partner-member-empty"><p class="partner-kicker">DASHBOARD MEMBER</p>'+
    '<h1>Komisi saya</h1><p>Data komisi belum berhasil dimuat.</p>'+
    '<button type="button" class="partner-btn partner-btn-outline" data-affiliate-refresh>Coba lagi</button></section>';
  // The backend decides membership status. Never reconstruct an unlocked
  // referral link from a cached profile or from the browser query string.
  const unlocked=a.mitra_aktif===true;
  const code=unlocked?String(a.kode_referral||''):'';
  const referralBase='https://cuan74468-ux.github.io/ngulik-digital-member/';
  const url=unlocked&&/^[A-Za-z0-9_-]{3,80}$/.test(code)&&
    String(a.link||'')===referralBase+'?ref='+encodeURIComponent(code)?a.link:'';
  if(!unlocked)return '<section class="partner-member partner-locked">'+
    '<p class="partner-kicker">AKSES AJAK TEMAN</p><h1>Aktifkan link komisi Anda.</h1>'+
    '<p>Starter Pack Rp15.000 membuka akses mitra seumur hidup, bonus 15 token AI, dan ruang kurasi. '+ 
    'Komisi hanya berlaku untuk pembelian yang memenuhi ketentuan setelah pembayaran diverifikasi.</p>'+
    '<button type="button" class="partner-btn partner-btn-primary" data-checkout-product="P-STARTER-15">Lihat Starter Pack '+icon('arrow')+'</button>'+
    '<button type="button" class="partner-btn partner-btn-outline" data-route="katalog">Lihat Katalog</button>'+
    '</section>';
  const ebookInvite=url?url+'&free=ebook':'';
  const classInvite=url?url+'&free=kelas':'';
  const all=Array.isArray(a.komisi)?a.komisi:[];
  const totals=a.saldo||{};
  const pending=Number(totals.PENDING)||0;
  const paid=Number(totals.PAID)||0;
  const requested=all.filter(x=>x.status==='APPROVED'&&!!x.payout_requested_at)
    .reduce((sum,x)=>sum+(Number(x.nominal)||0),0);
  const eligible=all.filter(x=>x.status==='APPROVED'&&!x.payout_requested_at)
    .reduce((sum,x)=>sum+(Number(x.nominal)||0),0);
  const canRequest=eligible>0&&isWriteEnabled()&&config.paymentsEnabled===true;
  const statusLabel={PENDING:'Dalam masa tahan',APPROVED:'Disetujui',PAID:'Dibayar',REVERSED:'Dibatalkan'};
  const rows=[...all].sort((x,y)=>String(y.created_at||'').localeCompare(String(x.created_at||''))).slice(0,50);
  const waShare=url?'https://wa.me/?text='+encodeURIComponent('Rekomendasi produk digital Ngulik Digital: '+url):'';
  return '<div class="partner-member">'+
    '<header class="partner-member-header"><div><p class="partner-kicker">DASHBOARD MEMBER</p>'+
      '<h1>Komisi & tautan saya</h1><p>Bagikan rekomendasi dan pantau hasilnya.</p></div>'+
      '<button type="button" class="partner-refresh" data-affiliate-refresh aria-label="Perbarui data komisi">'+icon('arrow')+' <span>Perbarui</span></button></header>'+
    '<section class="partner-link-panel" aria-label="Tautan ajak teman">'+
      '<div class="partner-link-copy"><p class="partner-kicker">LINK AJAK TEMAN ANDA</p>'+
        '<h2>Satu tautan untuk mulai berbagi.</h2><p>Kirim kepada teman yang mungkin membutuhkan produk Ngulik Digital.</p>'+
        '<div class="partner-link-url" aria-label="Tautan pribadi">'+(url?esc(url):'Tautan belum tersedia')+'</div>'+
        (url?'<span class="partner-code">Kode Anda: <strong>'+esc(code)+'</strong></span>':'')+'</div>'+
      '<div class="partner-link-actions">'+
        '<button type="button" class="partner-btn partner-btn-primary" data-copy="'+esc(url)+'"'+(!url?' disabled':'')+'>'+icon('link')+' Salin tautan</button>'+
        (url?'<a class="partner-btn partner-btn-outline" href="'+esc(waShare)+'" target="_blank" rel="noopener noreferrer">Bagikan ke WhatsApp '+icon('arrow')+'</a>':'')+
      '</div></section>'+
    '<section class="partner-wallet" aria-label="Ringkasan komisi">'+
      '<header class="partner-section-heading"><div><h2>Ringkasan komisi</h2><p>Nilai dari transaksi yang tercatat di akun Anda.</p></div></header>'+
      '<div class="partner-metric-grid">'+
        [['Siap diajukan',eligible,'approved','Komisi disetujui yang belum diajukan'],
         ['Dalam masa tahan',pending,'pending','Menunggu verifikasi dan masa tahan'],
         ['Sedang diajukan',requested,'requested','Menunggu tindak lanjut admin'],
         ['Sudah dibayar',paid,'paid','Riwayat pencairan yang selesai']].map(x=>
          '<article class="partner-metric partner-metric-'+x[2]+'"><span>'+x[0]+'</span>'+
          '<strong>'+rupiah(x[1])+'</strong><small>'+x[3]+'</small></article>').join('')+'</div>'+
      '<div class="partner-reach" aria-label="Aktivitas ajak teman">'+
        '<div><span>Klik tercatat</span><strong>'+esc(a.klik??0)+'</strong></div>'+
        '<div><span>Member diajak</span><strong>'+esc(a.pendaftar??0)+'</strong></div>'+
        '<div><span>Catatan komisi</span><strong>'+esc(all.length)+'</strong></div>'+
      '</div></section>'+
    '<details class="partner-free-links" aria-label="Bagikan materi gratis">'+
      '<summary><span><strong>Bagikan materi gratis</strong><small>eBook & kelas dengan tautan ajak teman</small></span><span aria-hidden="true">+</span></summary>'+
      '<p>Tautan akan membuka Ngulik Digital terlebih dahulu sebelum mengarahkan ke materi gratis.</p>'+
      (url?'<div class="partner-free-links-grid">'+
        '<div><strong>eBook gratis</strong><button type="button" class="partner-btn partner-btn-outline" data-copy="'+esc(ebookInvite)+'">Salin tautan eBook</button>'+
          '<a href="https://wa.me/?text='+encodeURIComponent('Baca eBook gratis Ngulik Digital: '+ebookInvite)+'" target="_blank" rel="noopener noreferrer">Bagikan via WA '+icon('arrow')+'</a></div>'+
        '<div><strong>Kelas gratis</strong><button type="button" class="partner-btn partner-btn-outline" data-copy="'+esc(classInvite)+'">Salin tautan kelas</button>'+
          '<a href="https://wa.me/?text='+encodeURIComponent('Ikut kelas gratis Ngulik Digital: '+classInvite)+'" target="_blank" rel="noopener noreferrer">Bagikan via WA '+icon('arrow')+'</a></div>'+
        '</div>':'<p>Kode ajak teman belum tersedia.</p>')+'</details>'+
    '<section class="partner-commission-panel" aria-label="Riwayat komisi">'+
      '<header class="partner-panel-head"><div><h2>Riwayat komisi</h2><p>Status terbaru dari transaksi yang memenuhi syarat.</p></div>'+
      '<span>Maks. 50 catatan</span></header>'+
      (rows.length?'<div class="partner-commission-list">'+rows.map(x=>
        '<article class="partner-commission-row"><div><strong>Komisi pembelian</strong>'+
        '<small>'+esc(friendlyDate(x.created_at))+(x.payout_requested_at?' · Sudah diajukan':'')+'</small></div>'+
        '<div class="partner-commission-amount"><strong>'+rupiah(x.nominal)+'</strong>'+
        '<span class="partner-status partner-status-'+esc(String(x.status||'').toLowerCase())+'">'+esc(statusLabel[x.status]||'Dalam proses')+'</span></div></article>'
      ).join('')+'</div>':
      '<div class="partner-empty"><h3>Belum ada komisi</h3><p>Mulai dengan membagikan tautan Anda. Komisi tercatat setelah transaksi memenuhi ketentuan.</p></div>')+'</section>'+
    '<section class="partner-payout" aria-label="Pengajuan pencairan">'+
      '<div><p class="partner-kicker">PENCAIRAN</p><h2>Tarik komisi</h2>'+
      '<p>'+(!config.paymentsEnabled?
        'Pencairan belum dibuka. Saldo dan riwayat tetap bisa dipantau.':
        'Pengajuan hanya untuk saldo disetujui yang memenuhi ketentuan minimum. Admin akan memverifikasi tujuan dan transfer.')+'</p></div>'+
      (canRequest?'<div class="partner-payout-form">'+
        '<label for="commission-dana-number">Nomor DANA tujuan</label>'+
        '<input id="commission-dana-number" class="input" type="tel" inputmode="tel" autocomplete="off" placeholder="08xxxxxxxxxx" pattern="08[0-9]{8,11}" maxlength="13">'+
        '<button type="button" class="partner-btn partner-btn-primary" data-affiliate-payout>Ajukan pencairan '+icon('arrow')+'</button></div>':
        '<span class="partner-payout-state">'+(!config.paymentsEnabled?'Belum dibuka':'Belum memenuhi syarat')+'</span>')+'</section>'+
    '<details class="partner-terms"><summary>Ketentuan program komisi</summary><p>'+esc(uiCommissionText_(state.info?.disclosure||
       'Komisi mengikuti ketentuan produk, pemeriksaan transaksi, masa tahan, dan pengembalian dana. Pengajuan bukan konfirmasi pembayaran.'))+'</p></details>'+
  '</div>';
}
function viewNotificationCenter(){
  if(!logged()||isAdmin())return '';
  const enabled=config.notificationsEnabled===true&&isConnected();
  const inbox=state.notifications||{items:[],unread:0};
  const items=Array.isArray(inbox.items)?inbox.items:[];
  const body=!enabled?
    '<p class="card-desc">Belum ada kabar baru.</p>':
    !items.length?'<p class="card-desc">Belum ada kabar baru.</p>':
    '<div class="list-rows">'+items.map(n=>'<div class="list-row"><div class="left">'+
      '<small>'+esc(friendlyDate(n.created_at))+'</small><strong>'+esc(n.judul||'Pembaruan')+'</strong>'+
      '<p class="card-desc">'+esc(n.pesan||'')+'</p></div>'+
      (n.status==='UNREAD'&&isWriteEnabled()?
        '<button type="button" class="btn btn-ghost btn-sm" data-action="notification-read" data-notification-id="'+
        esc(n.notification_id)+'">Tandai dibaca</button>':'')+'</div>').join('')+'</div>';
  return '<section class="surface section-gap" aria-label="Pusat notifikasi member">'+
    '<p class="card-kicker">KABAR TERBARU</p><h3>Notifikasi'+
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
    '<p class="card-kicker">PROFIL USAHA</p><h3>Edit Profil Usaha</h3>'+
    '<p class="card-desc">Nomor WhatsApp dan saldo tidak dapat diubah di halaman ini.</p>'+
    '<div class="grid-2">'+fields.map(([label,name,max])=>
      '<div class="field"><label for="profile-'+name+'">'+esc(label)+'</label>'+
      '<input class="input" id="profile-'+name+'" name="'+name+'" value="'+esc(m[name]||'')+
      '" maxlength="'+max+'" '+(['nama','nama_usaha'].includes(name)?'required minlength="2"':'')+'></div>').join('')+
    '</div><div class="field"><label for="profile-deskripsi">Deskripsi usaha</label>'+
    '<textarea class="input" id="profile-deskripsi" name="deskripsi_usaha" maxlength="500" rows="3">'+
    esc(m.deskripsi_usaha||'')+'</textarea></div>'+
    '<button type="submit" class="btn btn-primary" '+(!isWriteEnabled()?'disabled':'')+
    '>Simpan perubahan</button>'+
    (!isWriteEnabled()?'<p class="form-hint">Profil belum bisa diubah.</p>':'')+'</form>';
}
function viewAccount(){
  if(!logged())return title('Akun Member','AKSES PRIBADI','Profil dan pengaturan hanya tersedia setelah masuk.')+
    '<div class="grid-2"><div class="surface"><h3>Sudah punya akun?</h3><p class="card-desc">Masuk memakai nomor WhatsApp Anda.</p><div class="actions" style="margin-top:20px"><button class="btn btn-primary" data-route="login">Masuk</button></div></div><div class="surface"><h3>Keamanan akun</h3><p class="card-desc">Jangan membagikan kode OTP atau tautan sesi kepada siapa pun.</p></div></div>';
  if(isAdmin()){
    const m=state.me;
    return title('Akun Admin','AKUN ADMIN','Lihat profil dan pengaturan akun Admin.')+
      '<div class="grid-2"><section class="surface"><p class="card-kicker">IDENTITAS ADMIN</p>'+
      '<div class="list-rows">'+[
        ['Nama',m.nama],['WhatsApp login',m.wa],['Peran','Administrator'],
        ['Status',m.status],['Bergabung',friendlyDate(m.joined_at)]
      ].map(([label,value])=>'<div class="list-row"><div class="left"><small>'+esc(label)+'</small>'+
        '<strong>'+esc(value||'-')+'</strong></div></div>').join('')+'</div></section>'+
      '<section class="surface"><p class="card-kicker">KEAMANAN & OPERASIONAL</p>'+
      '<h3>Akses panel pengelola</h3><p class="card-desc">Jaga kerahasiaan PIN Admin Anda.</p>'+
      '<div class="admin-account-actions">'+[
        ['admin','Buka dasbor operasional'],['lms','Kelola kelas dan materi'],
        ['pesanan','Tinjau pesanan'],['dukungan','Buka layanan bantuan']
      ].map(([route,label])=>'<button type="button" class="quick-action" data-route="'+route+'">'+
        '<span>'+esc(label)+'</span>'+icon('arrow')+'</button>').join('')+'</div>'+
      '<button type="button" class="btn btn-secondary" data-action="logout">'+icon('logout')+
      ' Keluar dari akun</button></section>'+
      '<section class="surface admin-password-panel"><p class="card-kicker">UBAH PIN</p>'+
      '<h3>Ganti PIN Admin</h3><p class="card-desc">Setelah ganti PIN, Anda perlu masuk lagi.</p>'+
      '<form id="admin-pin-form" class="stack">'+
      '<div class="field"><label for="admin-pin-old">PIN saat ini</label><input class="input" type="password" id="admin-pin-old" name="pin_lama" pattern="[0-9]{6}" inputmode="numeric" autocomplete="current-password" maxlength="6" required></div>'+
      '<div class="field"><label for="admin-pin-new">PIN baru</label><input class="input" type="password" id="admin-pin-new" name="pin_baru" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" maxlength="6" required></div>'+
      '<div class="field"><label for="admin-pin-confirm">Ulangi PIN baru</label><input class="input" type="password" id="admin-pin-confirm" name="pin_konfirmasi" pattern="[0-9]{6}" inputmode="numeric" autocomplete="new-password" maxlength="6" required></div>'+
      '<button type="submit" class="btn btn-primary" '+(!adminLoginEnabled()?'disabled':'')+'>Ganti PIN</button></form></section></div>';
  }
  const m=state.me;return title('Akun Anda','PROFIL MEMBER','Periksa detail akun Anda.')+
    '<div class="grid-2"><div class="surface"><p class="card-kicker">INFORMASI AKUN</p>'+
    '<div class="list-rows">'+[
      ['Nama',m.nama],['Nama usaha',m.nama_usaha],['WhatsApp',m.wa],['Status',m.status],['Kode ajak teman',m.kode_referral],['Bergabung',friendlyDate(m.joined_at)]
    ].map(([k,v])=>'<div class="list-row"><div class="left"><small>'+esc(k)+'</small><strong>'+esc(v||'-')+'</strong></div></div>').join('')+'</div></div>'+
    '<div class="surface"><p class="card-kicker">AKSES & KEAMANAN</p><h3>Keamanan akun</h3><p class="card-desc">Keluar jika memakai perangkat bersama.</p><div class="actions" style="margin-top:24px"><button class="btn btn-secondary" data-action="logout">'+icon('logout')+' Keluar dari akun</button></div>'+
    '<div class="divider"></div><h3>Pesanan saya</h3><button class="btn btn-ghost" data-route="pesanan">Lihat riwayat pesanan '+icon('arrow')+'</button><div class="divider"></div><h3>Program komisi</h3><button class="btn btn-ghost" data-route="affiliate">Lihat komisi saya '+icon('arrow')+'</button>'+
    '<div class="divider"></div><h3>Bantuan & dukungan</h3><button class="btn btn-ghost" data-route="dukungan">Laporkan kendala '+icon('arrow')+'</button></div></div>'+viewNotificationCenter()+viewProfileEditor();
}
function viewLogin(register=false,adminMode=false){
  if(register&&!registrationOtpEnabled()&&!state.registrationWaitlist){
    return '<section class="ngd-role-gate"><p class="eyebrow">PENDAFTARAN MEMBER</p><h1>Pendaftaran belum dibuka.</h1>'+
      '<p>Anda masih bisa melihat katalog dan layanan, serta membuka materi gratis dari beranda. Akun yang sudah terdaftar dapat masuk melalui WhatsApp dan OTP pada layanan yang telah aktif.</p>'+
      '<div class="ngd-role-actions"><button type="button" class="btn btn-primary" data-route="katalog">Jelajahi Katalog '+icon('arrow')+'</button>'+
      '<button type="button" class="btn btn-secondary" data-route="login">Sudah punya akun? Masuk</button></div></section>';
  }
  if(register&&state.registrationWaitlist){
    const pos=Number(state.registrationWaitlist.posisi);
    return '<section class="login-shell" role="status" aria-live="polite">'+
      '<p class="eyebrow">PENDAFTARAN DITERIMA</p>'+
      '<h1>Anda Ada di Daftar Tunggu</h1>'+
      '<p class="lead">Nomor WhatsApp sudah terverifikasi. Kami kabari saat akun aktif.</p>'+
      (Number.isInteger(pos)&&pos>0?'<div class="surface"><strong>Posisi antrean: '+esc(pos)+'</strong></div>':'')+
      '<p class="card-desc">Anda bisa masuk setelah akun aktif.</p>'+
      '<div class="actions"><button type="button" class="btn btn-primary" data-route="beranda">Kembali ke beranda</button>'+
      '<button type="button" class="btn btn-secondary" data-route="login">Masuk nanti</button></div></section>';
  }
  const memberOtp=!adminMode&&!register;
  // Member authentication is WhatsApp OTP, never an assumed PIN.
  // Backend and environment release gates still apply.
  const enabled=adminMode?adminLoginEnabled():
    register?registrationOtpEnabled():memberOtpLoginEnabled();
  return '<div class="login-shell ngd-auth-v10">'+
    '<div class="ngd-auth-brand"><img src="'+esc(defaultBrandLogoSrc)+'" alt="" decoding="async">'+
      '<span><strong>Ngulik Digital</strong><small>Marketplace Produk Digital</small></span></div>'+
    '<p class="eyebrow">'+
    (adminMode?'AKSES PENGELOLA':register?'BERGABUNG':'SELAMAT DATANG KEMBALI')+'</p>'+
    '<h1>'+
    (adminMode?'Masuk sebagai Admin.':register?'Daftar akun.':'Masuk ke akun Anda.')+'</h1>'+
    '<p class="lead">'+
    (!adminMode&&state.pendingPurchaseId?'Masuk atau daftar gratis pakai WhatsApp untuk melanjutkan pesanan dan menyimpan akses produk Anda.':adminMode?'Masuk dengan nomor WhatsApp Admin dan PIN enam angka.':
      register?'Daftar dengan nomor WhatsApp. Verifikasi dilakukan melalui kode WhatsApp.':
      'Masukkan nomor WhatsApp dan kode OTP. Member tidak perlu membuat PIN.')+'</p>'+
    '<form id="auth-form" class="surface" data-mode="'+(adminMode?'admin':register?'register':'login')+'">'+
    (register?'<div class="field"><label for="nama">Nama lengkap</label><input class="input" id="nama" name="nama" autocomplete="name" required minlength="2" maxlength="80"></div>'+
      '<div class="field"><label for="usaha">Nama usaha</label><input class="input" id="usaha" name="nama_usaha" required minlength="2" maxlength="100"></div>':'')+
    '<div class="field"><label for="wa">Nomor WhatsApp</label><input class="input" id="wa" name="wa" required inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx"></div>'+
    (memberOtp?'<div class="field"><label for="login-otp">Kode OTP WhatsApp</label><input class="input" id="login-otp" name="otp" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="6 digit OTP"></div>'+
      '<label class="small"><input type="checkbox" name="setuju_pengiriman" required> Saya setuju menerima OTP melalui WhatsApp.</label>'+
      '<div class="actions"><button type="button" class="btn btn-secondary" data-action="member-otp-request" '+(!enabled?'disabled':'')+'>Kirim Kode</button></div>':
      '<div class="field"><label for="pin">'+(adminMode?'PIN Admin 6 angka':'PIN registrasi')+'</label><input class="input" id="pin" name="pin" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" type="password" autocomplete="'+(register?'new-password':'current-password')+'" placeholder="••••••"></div>')+
    (register?'<div class="field"><label for="otp">Kode OTP WhatsApp</label><input class="input" id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" type="text" required placeholder="6 digit kode verifikasi"></div>'+
      '<div class="actions" style="margin-bottom:13px"><button type="button" class="btn btn-secondary" data-action="otp-request" '+(!enabled?'disabled':'')+'>Kirim Kode</button>'+
      '<button type="button" class="btn btn-ghost" data-action="otp-verify" '+(!enabled?'disabled':'')+'>Verifikasi kode</button></div>':'')+
    (register?'<div class="field"><label><input type="checkbox" name="setuju_kebijakan" required> Saya setuju dengan syarat dan kebijakan privasi.</label></div>':'')+
    '<button class="btn btn-primary btn-wide" type="submit" '+(!enabled?'disabled':'')+'>'+
    (adminMode?'Masuk admin':register?'Buat akun':'Masuk')+' '+icon('arrow')+'</button>'+
    '<p class="form-hint" style="margin:13px 0 0">'+
    (enabled?(memberOtp?'Kode berlaku 5 menit, maksimal 3 percobaan. Jangan bagikan kode.':adminMode?'Jangan bagikan PIN Admin Anda.':'Verifikasi WhatsApp diperlukan sebelum aktivasi akun.'):
      adminMode?'Akses administrator belum diaktifkan pada backend. Akun yang sudah ada tetap aman.':
      register?'Pendaftaran baru belum dibuka pada layanan ini.':'Login OTP member belum diaktifkan pada layanan ini. Tidak perlu memasukkan PIN.')+'</p></form>'+
    '<p class="small login-other-route">'+
    (adminMode?'<button class="btn btn-ghost btn-sm" data-route="login">Kembali ke login</button>':
      register?'Sudah punya akun? <button class="btn btn-ghost btn-sm" data-route="login">Masuk</button>':
      '<button class="btn btn-ghost btn-sm" data-route="daftar">Belum punya akun? Daftar</button>')+
    '</p>'+
    (adminMode&&!String(config.brand||'').includes('STAGING')?
      '<section class="admin-env-notice"><strong>Database STAGING menggunakan Admin Studio terpisah.</strong>'+
      '<p>Website ini memakai deployment Apps Script yang berbeda. Untuk input banner, katalog, LMS dan jasa pada STAGING yang sudah aktif, gunakan editor berikut.</p>'+
      '<a class="btn btn-primary" href="./staging/member.html#admin-login">Buka Admin Studio STAGING '+icon('arrow')+'</a></section>':'')+
    '</div>';
}
function viewMyOrders(){
  if(!logged())return '<section class="ngd-role-gate"><p class="eyebrow">RUANG MEMBER / PESANAN</p><h1>Pesanan Anda tersimpan di akun.</h1>'+
    '<p>Masuk menggunakan WhatsApp dan OTP untuk memeriksa status pembayaran, akses produk, dan riwayat belanja.</p>'+
    '<button type="button" class="btn btn-primary" data-route="login">Masuk sebagai Member '+icon('arrow')+'</button></section>';
  return title('Pesanan saya','RIWAYAT PESANAN','Lihat status dan rincian pesanan Anda.')+
    (!state.orders.length?empty('Belum ada pesanan','Pesanan Anda akan muncul di sini.','katalog','Lihat katalog'):
    '<div class="stack order-history-list">'+state.orders.map(o=>{
      const status=String(o.status||'');
      const due=new Date(o.expires_at).getTime();
      const overdue=status==='PENDING'&&(!Number.isFinite(due)||due<=Date.now());
      const step=overdue?'Batas pembayaran lewat — minta bantuan Admin':
        status==='PENDING'?'Lanjutkan pembayaran atau hubungi Admin':
        status==='MENUNGGU_VERIFIKASI'?'Menunggu Admin mencocokkan dana':
        status==='FULFILLED'?'Selesai — akses produk sudah diproses':
        status==='PAID'?'Pembayaran diterima — pemenuhan diproses':
        status==='EXPIRED'?'Pesanan kedaluwarsa':
        status==='CANCELLED'?'Pesanan dibatalkan':'Lihat rincian dan tindak lanjut';
      return '<button type="button" class="surface order-history-item order-history-open" data-order-detail="'+esc(o.order_id)+'" aria-label="Buka detail pesanan '+esc(o.order_id)+'">'+
        '<span class="order-history-top"><strong class="order-history-name">'+esc(o.nama_produk||'Produk')+'</strong>'+safeBadge(status)+'</span>'+
        '<span class="order-history-meta"><span>'+esc(o.order_id)+' · '+friendlyDate(o.created_at)+'</span><strong>'+rupiah(o.total_bayar)+'</strong></span>'+
        '<span class="order-history-next">'+esc(step)+'</span>'+
        '<span class="order-history-action">Buka detail &amp; tindak lanjut '+icon('arrow')+'</span></button>';
    }).join('')+'</div>');
}
function checkoutFreeUrl_(p){
  return moneyValue(p?.harga)===0&&String(p?.product_id)==='P-EBOOK'?NGD_FREE_EBOOK_URL:
    moneyValue(p?.harga)===0&&String(p?.product_id)==='P-CLASS-CH1'?NGD_FREE_CLASSROOM_URL:'';
}
function checkoutQrReady_(){
  // Browser UI is presentation only; GAS also checks NGD_FINANCE_ENABLED.
  return paymentEnabled()&&config.qrisOwnerImageApproved===true&&!!qrisUrl()&&
    Boolean(String(config.qrisMerchant||''))&&
    state.workspaceInfo?.finance_enabled!==false&&
    state.workspaceInfo?.mutations_enabled!==false;
}
function openProductCheckout_(id){
  const product=Array.isArray(state.catalog)?state.catalog.find(p=>
    String(p.product_id)===String(id)&&!isPublicQaOffer_(p)):null;
  if(!product){toast('Produk belum tersedia. Muat ulang katalog.',true);return;}
  state.checkoutProductId=String(product.product_id);
  if(!logged()){
    state.pendingPurchaseId=state.checkoutProductId;
    go('login');return;
  }
  state.checkoutRequestId=null;state.lastOrder=null;
  state.orderDetailLoading=false;state.checkoutReturnRoute='katalog';
  go('checkout');
}
function viewCheckoutDraft_(){
  const p=state.catalog.find(x=>String(x.product_id)===state.checkoutProductId&&!isPublicQaOffer_(x));
  if(!p)return title('Checkout','PRODUK & JASA','')+
    empty('Produk tidak ditemukan','Kembali ke katalog untuk memilih produk.','katalog','Katalog');
  const price=moneyValue(p.harga);
  const free=price===0;
  const freeUrl=checkoutFreeUrl_(p);
  const orderable=price!==null&&price>0&&Number.isSafeInteger(price)&&
    supportedSaleTypes.has(String(p.tipe));
  const ready=checkoutQrReady_();
  const canCreate=orderable&&ready&&!isAdmin();
  const cta=free?
    (freeUrl?'<a class="btn btn-primary btn-wide" href="'+esc(freeUrl)+'" target="_blank" rel="noopener noreferrer">Buka akses gratis '+icon('arrow')+'</a>':
      '<p class="checkout-note">Akses gratis ini belum tersedia. Tidak ada biaya yang harus dibayar.</p>'):
    canCreate?
      '<button type="button" class="btn btn-primary btn-wide" data-checkout-create="'+idSafe(p.product_id)+'">'+
        (logged()?'Buat pesanan QRIS':'Masuk & lanjut ke QRIS')+' '+icon('arrow')+'</button>':
    '<button class="btn btn-primary btn-wide" type="button" disabled>Pembayaran belum dibuka</button>';
  const reason=!free&&(!orderable?
    'Produk belum memenuhi persyaratan checkout (jenis atau harga). Tidak ada tagihan yang dibuat.':
    !ready?'QRIS DANA Bisnis masih menunggu verifikasi merchant dan aktivasi pembayaran. Jangan mentransfer dana sekarang.':'');
  return '<div class="checkout-backdrop"><section class="checkout-dialog checkout-product-preview" role="dialog" aria-modal="true" aria-labelledby="checkout-title">'+
    '<header class="checkout-heading"><div><p class="eyebrow">NGULIK DIGITAL / CHECKOUT</p>'+
      '<h1 id="checkout-title">Rincian Checkout</h1><p>Periksa produk sebelum membuat pesanan.</p></div>'+
      '<button type="button" class="checkout-close" data-route="katalog" aria-label="Kembali ke katalog">×</button></header>'+
    '<div class="checkout-summary"><section><h2>Produk pilihan</h2>'+
      '<div class="price-line"><span>Nama produk</span><strong>'+esc(offerUiTitle_(p))+'</strong></div>'+
      '<p class="checkout-note">'+esc(offerUiDescription_(p))+'</p>'+
      '<div class="price-line"><span>Jenis produk</span><strong>'+esc(offerCategoryLabel(p))+'</strong></div>'+
      (Number(p.kredit_diberikan)>0?'<div class="price-line"><span>Token diterima</span><strong>'+esc(p.kredit_diberikan)+'</strong></div>':'')+
      (Number(p.durasi_hari)>0?'<div class="price-line"><span>Masa akses</span><strong>'+esc(p.durasi_hari)+' hari</strong></div>':'')+
      '<div class="checkout-total"><small>Harga produk</small><strong class="checkout-total-amount">'+
        (free?'Gratis':price!==null?rupiah(p.harga):'Harga belum tersedia')+'</strong></div>'+
      (!free&&orderable?'<p class="checkout-note">Nominal akhir dan kode unik akan dihitung server setelah pesanan dibuat.</p>':'')+
    '</section><section><h2>'+ (free?'Akses gratis':'Metode pembayaran')+'</h2>'+
      (free?'<p class="checkout-note">Produk ini tidak memerlukan pembayaran QRIS.</p>':
       '<div class="checkout-qr checkout-payment-closed"><strong>QRIS Statis · DANA Bisnis</strong>'+
       '<p>Merchant: '+esc(config.qrisMerchant||'Belum diverifikasi')+'</p>'+
       '<p class="checkout-note">'+(ready?
         'Pesanan yang dibuat akan menampilkan QRIS dan nominal final yang harus dibayar.':
         'Pembayaran belum aktif. QRIS tidak ditampilkan sampai diverifikasi.')+'</p></div>')+
      (reason?'<p class="checkout-note" role="status">'+esc(reason)+'</p>':'')+
      cta+
      '<button type="button" class="btn btn-ghost btn-wide" data-route="katalog">Kembali ke katalog</button>'+
    '</section></div></section></div>';
}
function viewCheckout(){
  const o=state.lastOrder;
  if(!o&&state.checkoutProductId)return viewCheckoutDraft_();
  if(!o)return title('Pembayaran','PESANAN ANDA','')+
    empty('Pesanan belum dipilih','Buka riwayat pesanan atau pilih produk.','pesanan','Riwayat pesanan');
  if(state.orderDetailLoading)return title('Memuat Pesanan','DETAIL PESANAN','Memuat status terbaru…')+
    '<section class="surface" role="status" aria-live="polite"><strong>'+esc(o.nama_produk||'Produk')+'</strong><p class="card-desc">'+esc(o.order_id)+' · '+rupiah(o.total_bayar)+'</p><p class="card-desc">Mengambil status pembayaran. Jangan transfer sebelum data terbaru berhasil dimuat.</p><button class="btn btn-secondary" data-route="pesanan" type="button">Kembali ke Pesanan</button></section>';
  const status=String(o.status||'PENDING');
  const expiryMs=new Date(o.expires_at).getTime();
  const expired=!Number.isFinite(expiryMs)||expiryMs<=Date.now();
  const open=status==='PENDING'&&!expired;
  const waiting=status==='MENUNGGU_VERIFIKASI';
  const paid=status==='PAID'||status==='FULFILLED';
  const finished=['EXPIRED','CANCELLED','REFUNDED'].includes(status);
  // Approved frontend asset is canonical; backend's historical relative path may
  // otherwise resolve under /staging/assets rather than the repository assets.
  const qrRaw=String(config.qrisOwnerImageApproved===true
    ?config.qrisImageUrl:(o.qris_gambar_path||config.qrisImageUrl||''));
  const bundledPlaceholder=config.qrisOwnerImageApproved!==true||
    /(?:^|\/)assets\/qris\.png(?:$|[?#])/i.test(qrRaw);
  const qrUrl=(()=>{try{const u=new URL(qrRaw,location.href);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}})();
  const merchant=String(config.qrisOwnerImageApproved===true
    ?config.qrisMerchant:(o.qris_atas_nama||config.qrisMerchant||''));
  const officialQr=!!(paymentEnabled()&&config.qrisOwnerImageApproved===true&&qrUrl&&merchant&&!bundledPlaceholder&&String(o.metode)==='QRIS_STATIS'&&state.workspaceInfo?.finance_enabled!==false);
  const seconds=open?Math.max(0,Math.ceil((expiryMs-Date.now())/1000)):0;
  const timer=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  const stateNote=status==='FULFILLED'?
    'Pembayaran telah diverifikasi. Hak akses atau token telah diproses. Lihat saldo di Meja Kerja.':
    status==='PAID'?'Dana telah diverifikasi oleh Admin; pemenuhan produk masih diproses.':
    waiting?'Konfirmasi Anda sudah diterima. Admin harus memeriksa mutasi dana sebelum pesanan dinyatakan lunas. Jangan transfer ulang.':
    finished?'Pesanan tidak lagi terbuka untuk pembayaran. Jangan mentransfer memakai nominal atau kode unik lama.':
    expired?'Batas pembayaran telah terlewati. Hubungi Admin jika Anda sudah membayar; jangan transfer ulang.':
    'Pesanan belum lunas. Pembayaran hanya sah setelah dana masuk dan Admin memverifikasinya.';
  const paymentSection=!open?
    '<div class="checkout-qr checkout-payment-closed"><strong>'+(
      waiting?'Menunggu pemeriksaan Admin':paid?'Pembayaran dan layanan':'Pembayaran ditutup')+
      '</strong><p class="checkout-note">'+esc(stateNote)+'</p></div>':
    officialQr?
      '<div class="checkout-qr"><strong>QRIS DANA Bisnis resmi</strong><img data-qris-image src="'+esc(qrUrl)+'" alt="QRIS penerima '+esc(merchant)+'" width="260" height="260">'+
      '<div data-qris-fallback class="qris-fallback" hidden>Gambar QRIS gagal dimuat. Jangan bayar sampai gambar tersedia.</div>'+
      '<strong>'+esc(merchant)+'</strong><p class="checkout-note">Pindai QRIS dari aplikasi bank atau dompet digital. Masukkan total akhir persis sesuai tagihan, termasuk kode unik. Simpan bukti pembayaran untuk verifikasi Admin.</p>'+
      '<a class="btn btn-secondary btn-wide" href="'+esc(qrUrl)+'" download="qris-linggau-ai-studio.svg">Simpan QRIS</a>'+
      '<a class="btn btn-ghost btn-wide" href="'+esc(qrUrl)+'" target="_blank" rel="noopener noreferrer">Perbesar QRIS</a></div>':
      '<div class="checkout-qr checkout-payment-closed" role="status"><strong>QRIS belum diaktifkan</strong>'+
      '<p class="checkout-note">Pembayaran ke DANA Bisnis belum tersedia untuk order ini. Jangan transfer uang menggunakan gambar atau instruksi lama.</p></div>';
  const financeBlocked=state.workspaceInfo&&(state.workspaceInfo.finance_enabled===false||state.workspaceInfo.mutations_enabled===false);
  const canConfirm=open&&paymentEnabled()&&!financeBlocked&&officialQr;
  return '<div class="checkout-backdrop"><section class="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">'+
    '<header class="checkout-heading"><div><p class="eyebrow">NGULIK DIGITAL / PESANAN</p>'+
    '<h1 id="checkout-title">Detail Pesanan</h1><p>Order '+esc(o.order_id)+'</p></div>'+
    '<button type="button" class="checkout-close" data-route="'+esc(state.checkoutReturnRoute||'pesanan')+'" aria-label="Kembali ke riwayat">×</button></header>'+
    '<div class="checkout-summary"><section><h2>Rincian Pesanan</h2>'+
    '<div class="price-line"><span>Produk</span><strong>'+esc(o.nama_produk||'—')+'</strong></div>'+
    '<div class="price-line"><span>Harga</span><strong>'+rupiah(o.harga_dasar)+'</strong></div>'+
    '<div class="price-line">'+(Number(o.total_bayar)===Number(o.harga_dasar)-Number(o.kode_unik)?
      '<span>Potongan kode unik</span><strong>− '+rupiah(o.kode_unik)+'</strong>':
      '<span>Kode unik pesanan lama</span><strong>+ '+rupiah(o.kode_unik)+'</strong>')+'</div>'+
    '<div class="checkout-total"><small>Total yang harus dibayar</small>'+
    '<strong class="checkout-total-amount" style="white-space:nowrap;font-variant-numeric:tabular-nums">'+rupiah(o.total_bayar)+'</strong>'+
    (open?'<button type="button" class="btn btn-secondary btn-sm" data-copy="'+esc(String(o.total_bayar))+'">Salin nominal</button>':'')+'</div>'+
    (open?'<p class="checkout-countdown" id="checkout-countdown" data-expiry="'+esc(o.expires_at||'')+'">Batas pembayaran: '+timer+'</p>':'')+
    '<div class="checkout-status-summary">'+safeBadge(status)+'<p>'+esc(stateNote)+'</p></div></section>'+
    '<section><h2>'+ (open?'Langkah pembayaran':'Status dan bantuan')+'</h2>'+paymentSection+
    (open&&officialQr?'<div class="checkout-steps"><strong>Setelah Bayar</strong><p>Tekan Saya Sudah Bayar. Admin akan mencocokkan mutasi DANA Bisnis dan nominal tepat sebelum pesanan diproses.</p></div>':'')+
    (canConfirm?'<button class="btn btn-primary btn-wide" type="button" data-action="confirm-payment">Saya Sudah Bayar</button>':'')+
    (open&&(!paymentEnabled()||financeBlocked)?'<p class="checkout-note"><strong>Konfirmasi pembayaran belum tersedia.</strong> Jangan transfer sebelum QRIS resmi aktif.</p>':'')+
    (paid?'<button type="button" class="btn btn-secondary btn-wide" data-route="beranda">Lihat saldo / akses saya</button>':'')+
    '<button type="button" class="btn btn-ghost btn-wide" data-route="pesanan">Kembali ke pesanan</button>'+
    '</section></div></section></div>';
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
    '<div class="section-head"><div><p class="eyebrow">STATUS LAYANAN</p>'+
    '<h2>Kondisi Layanan</h2>'+
    '<p>Periksa kondisi layanan sebelum melakukan perubahan.</p></div></div>'+
    (schema?'<div class="admin-runtime-summary"><div><small>Data tersedia</small>'+
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
  if(!isAdmin())return needLogin('ruang kerja');
  const details=state.adminSummary?.ringkasan||[];
  return '<section class="admin-operations-intro"><p class="eyebrow">PUSAT OPERASIONAL / ADMIN</p><h1>Prioritas pengelolaan hari ini.</h1><p>Tinjau pesanan dan dukungan, kemudian kelola katalog, konten, kelas, serta anggota. Data operasional tetap mengikuti izin backend.</p>'+
    (config.brand?.includes('STAGING')?'<span class="chip">DATA STAGING — bukan website produksi</span>':'<span class="chip">Data sesuai layanan terhubung</span>')+'</section>'+
    '<section class="admin-start-actions" aria-label="Mulai mengelola bisnis">'+
    '<div><p class="eyebrow">PINTASAN UTAMA</p><h2>Pilih yang Mau Dikelola</h2></div>'+
    '<div class="admin-start-grid">'+[
      ['konten','Pasang banner','Atur gambar, judul dan tombol promosi.'],
      ['produk','Tambah produk','Masukkan nama, harga dan katalog.'],
      ['lms','Buat kelas LMS','Susun kurikulum dan pelajaran.'],
      ['layanan','Kelola jasa','Tinjau brief dan penawaran pelanggan.']
    ].map(([route,heading,detail])=>'<button type="button" class="admin-start-item" data-route="'+route+'">'+
      '<strong>'+heading+' '+icon('arrow')+'</strong><small>'+detail+'</small></button>').join('')+
    '</div></section>'+
    '<div class="admin-section-heading"><div><p class="eyebrow">OPERASIONAL</p><h2>Pantau dan tindak lanjuti</h2></div><p>Buka menu yang ingin Anda kelola.</p></div>'+ 
    '<div class="admin-module-grid">'+[
      ['clipboard','Pesanan','Pantau status pembayaran dan pemenuhan akses.','pesanan'],
      ['users','Kelola member','Periksa akun dan status keanggotaan.','member'],
      ['clipboard','Tiket masuk','Jawab pertanyaan dan tindak lanjuti kendala.','dukungan'],
      ['clock','Antrean pendaftaran','Pantau kuota dan member menunggu.','antrean'],
      ['grid','Rilis produk','Kelola versi dan informasi pembaruan.','rilis'],
      ['shield','Pengaturan','Tinjau konfigurasi layanan yang berlaku.','pengaturan']
    ].map(x=>'<article class="surface admin-module-card"><div class="surface-icon">'+icon(x[0])+'</div><h3>'+x[1]+'</h3><p class="card-desc">'+x[2]+'</p><button class="btn btn-ghost btn-sm" data-route="'+x[3]+'">Buka materi '+icon('arrow')+'</button></article>').join('')+'</div>'+
    '<section class="section-gap">'+title('Ringkasan','RINGKASAN','Angka diperbarui dari data usaha.')+
    (details.length?'<div class="grid-3">'+details.slice(0,12).map(x=>'<div class="stat"><div class="stat-value">'+esc(x.nilai)+'</div><div class="stat-label">'+esc(x.metrik)+'</div></div>').join('')+'</div>':
    empty('Ringkasan Belum Tersedia','Periksa koneksi lalu coba lagi.'))+'</section>';
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
      ['komisi_persen','Komisi (%)'],
      ['masa_tahan_hari','Masa tahan komisi (hari)'],
      ['min_payout','Minimum pencairan (Rp)']]],
    ['Informasi publik',[
      ['teks_disclosure_affiliate','Keterangan komisi']]]
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
      '<section class="section-gap">'+title(heading,'PENGATURAN','Menampilkan pengaturan yang tersimpan.')+
      '<div class="grid-3">'+fields.map(([key,label])=>cell(key,label)).join('')+'</div></section>').join(''):
    empty('Pengaturan Belum Tersedia',state.adminSettingsError||
      'Sesi atau koneksi ke backend belum selesai dimuat.');
  const status='Pengaturan global ditampilkan untuk referensi. Untuk input banner, katalog, dan kelas, gunakan modul Admin terkait. Status izin backend ditampilkan terpisah di bawah.';
  return '<section class="section-head"><div><p class="eyebrow">ADMIN / PENGATURAN</p>'+
    '<h2>Pengaturan Ngulik Digital</h2><p>Lihat pengaturan layanan yang sedang digunakan.</p></div></section>'+
    '<div class="banner"><div><h3>Pengaturan Layanan</h3><p>'+esc(status)+'</p></div></div>'+
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
    ['SEAT_30H','Seat 30 hari'],['TOPUP_TOKEN','Isi Token'],['TOPUP_KREDIT','Top-up kredit'],
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
    '" '+(type==='number'?'min="'+(name==='urut'||(name==='harga'&&draft.tipe!=='PRODUK_DIGITAL')?'1':'0')+'" step="1"':'maxlength="'+max+'"')+
    ' value="'+esc(draft[name]??'')+'" required></div>';
  const bool=(name,label)=>
    '<label class="catalog-check"><input type="checkbox" name="'+name+'" '+
    (draft[name]===true?'checked':'')+'/><span>'+label+'</span></label>';
  const intro='<div class="catalog-admin-intro"><div><p class="eyebrow">ADMIN / KATALOG</p>'+
    '<h1>Kelola Katalog</h1><p>Atur nama, deskripsi, dan harga produk.</p></div>'+
    '<span class="chip">'+items.length+' produk tercatat</span></div>'+
    '<div class="banner '+(canWrite?'info':'warning')+'"><div><h3>'+(canWrite?'Katalog Siap Diedit':'Edit Katalog Belum Tersedia')+'</h3>'+
    '<p>Periksa detail produk sebelum menayangkannya.</p></div>'+
    '<span class="chip orange">'+(canWrite?'EDIT PRODUK':'TIDAK DAPAT DIEDIT')+'</span></div>';
  const entries='<section class="catalog-admin-list" aria-label="Daftar Produk">'+
    items.map(p=>'<article class="catalog-admin-row">'+
      '<div class="catalog-admin-badge">'+icon(p.tipe==='TOPUP_KREDIT'?'spark':'store')+'</div>'+
      '<div class="catalog-admin-row-info"><h3>'+esc(p.nama)+'</h3>'+
      '<p>'+esc(offerCategoryLabel(p))+' · '+rupiah(p.harga)+' · '+
      (p.aktif?'Tampil di publik':'Disembunyikan')+
      (supportedSaleTypes.has(p.tipe)?'':' · Checkout belum didukung')+'</p></div>'+
      '<div class="catalog-admin-controls"><button class="btn btn-secondary btn-sm" type="button" '+
      'data-catalog-edit="'+esc(p.product_id)+'">Edit</button>'+
      '<button class="btn btn-secondary btn-sm" type="button" data-catalog-image="'+esc(p.product_id)+'">Foto produk</button>'+
      '<button class="btn btn-ghost btn-sm" type="button" data-catalog-active="'+esc(p.product_id)+'" '+
      'aria-label="'+(p.aktif?'Nonaktifkan':'Aktifkan')+' '+esc(p.nama)+'" '+
      (!canWrite?'disabled title="Pengelolaan katalog belum diaktifkan"':'')+'>'+
      (p.aktif?'Nonaktifkan':'Aktifkan')+'</button></div></article>').join('')+
    (!items.length?'<div class="empty"><h3>Belum Ada Produk</h3><p>Produk yang ditambahkan akan muncul di sini.</p></div>':'')+
    '</section>';
  const form='<section class="catalog-admin-editor" aria-label="Editor katalog">'+
    '<div class="catalog-admin-editor-head"><div><p class="card-kicker">EDIT PRODUK</p><h2>'+
    (selected?'Edit penawaran':'Tambah penawaran')+'</h2>'+
    '<p class="card-desc">Produk baru disimpan tanpa ditayangkan.</p></div>'+
    (selected?'<button type="button" class="btn btn-secondary btn-sm" data-action="catalog-new">Buat baru</button>':'')+'</div>'+
    '<form id="admin-catalog-form" class="catalog-admin-form" data-product-id="'+esc(selected?.product_id||'')+'">'+
    '<div class="catalog-form-grid">'+
    input('nama','Nama produk','text',120)+input('harga','Harga (Rp)','number',0)+
    '<div class="field"><label for="cat-tipe">Jenis produk</label>'+
    '<select class="input" id="cat-tipe" name="tipe" '+(selected?'disabled':'')+'>'+
    types.map(x=>'<option value="'+x[0]+'" '+(draft.tipe===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+
    '</select></div>'+
    input('urut','Urutan tampilan','number',0)+
    input('kredit_diberikan','Kredit diberikan','number',0)+
    input('durasi_hari','Durasi hari (0 atau 30)','number',0)+
    '<div class="field"><label for="cat-komisi">Komisi (%) — kosongkan untuk standar</label>'+
    '<input class="input" id="cat-komisi" name="komisi_persen" type="number" min="0" max="50" step="1" placeholder="Default" value="'+
    esc(draft.komisi_persen??'')+'"></div>'+
    '<div class="field"><label for="cat-sumber">Asal produk</label>'+
    '<input class="input" id="cat-sumber" name="sumber_produk" maxlength="60" required '+
    'pattern="[A-Za-z0-9_-]{2,60}" value="'+esc(draft.sumber_produk||'INTERNAL')+'"></div></div>'+
    '<div class="field"><label for="cat-deskripsi">Deskripsi produk</label>'+
    '<textarea class="input" id="cat-deskripsi" name="deskripsi" maxlength="350" minlength="10" rows="4" required>'+
    esc(draft.deskripsi)+'</textarea></div>'+
    '<div class="catalog-checks">'+bool('perlu_approval_admin','Memerlukan persetujuan admin')+
    bool('bisa_komisi','Memenuhi syarat komisi')+'</div>'+
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
      selectedId:state.contentEditId,defaultPlacement:state.contentPresetProductId,products:adminCatalogItems(),enabled:contentWriteEnabled()}):
    empty('Editor belum tersedia','Komponen pengelolaan konten belum termuat.');
}
const serviceWriteEnabled=()=>isWriteEnabled()&&config.serviceEnabled===true;
function viewServiceRequests(){
  if(!logged()&&!isAdmin()){
    // A sales-facing page uses actual published catalogue items and backend prices.
    // No synthetic portfolio, fixed price, or guest order creation.
    const services=(Array.isArray(state.catalog)?state.catalog:[])
      .filter(p=>String(p.tipe)==='JASA_SEKALI'&&!isPublicQaOffer_(p));
    const packages=services.map(p=>{
      const price=moneyValue(p.harga);
      const imageSrc=ngdPremiumArtSrc_(ngdProductArtId_(p,'jasa'));
      const detail=offerUiDescription_(p)||'Rincian paket mengikuti informasi produk yang diterbitkan.';
      return '<article class="ngdb-package">'+
        '<div class="ngdb-package-media"><img src="'+esc(imageSrc)+'" alt="Visual '+esc(offerUiTitle_(p))+
          '" loading="lazy" decoding="async"></div>'+
        '<div class="ngdb-package-main">'+
          '<p class="ngdb-overline">PAKET JASA TERSEDIA</p>'+
          '<h3>'+esc(offerUiTitle_(p))+'</h3>'+
          '<p>'+esc(detail)+'</p>'+
          '<details class="ngdb-package-detail"><summary>Lihat informasi paket</summary>'+
            '<p>Rincian pekerjaan dan ketentuan mengikuti deskripsi paket. Pastikan pilihan sesuai kebutuhan sebelum memesan.</p>'+
          '</details>'+
        '</div>'+
        '<div class="ngdb-package-buy">'+
          '<span>Harga katalog</span><strong>'+rupiah(price)+'</strong>'+
          (price!==null&&price>0?
            '<button type="button" data-checkout-product="'+idSafe(p.product_id)+
            '">Masuk untuk pesan '+icon('arrow')+'</button>':
            '<span class="ngdb-unavailable">Belum dapat dipesan</span>')+
        '</div></article>';
    }).join('');
    const examples=[
      ['Video & Konten Promosi','Untuk materi visual jualan dan konten pendek.','ngd-v8-video.webp'],
      ['Katalog & Website Usaha','Supaya informasi produk dan usaha lebih mudah dibagikan.','ngd-v8-templates.webp'],
      ['Otomasi Pekerjaan','Untuk pekerjaan berulang yang bisa dibantu alur digital.','ngd-v8-gas.webp']
    ];
    return '<div class="ngd-buyer-services">'+
      '<header class="ngdb-hero">'+
        '<div class="ngdb-hero-copy"><p class="ngdb-overline">BENGKEL KREATIF · NGULIK DIGITAL</p>'+
          '<h1>Butuh yang jadi, bukan tambah kerjaan?</h1>'+
          '<p>Video promosi, katalog usaha, atau pekerjaan digital yang terus tertunda. Ceritakan kebutuhannya, lalu pilih paket yang memang tersedia atau kirim permintaan khusus.</p>'+
          '<div class="ngdb-actions"><button type="button" class="ngdb-button ngdb-primary" data-services-packages>Lihat paket & harga</button>'+
          '<button type="button" class="ngdb-button ngdb-outline" data-service-request>Ajukan kebutuhan khusus</button></div>'+
          '<small>Harga paket mengikuti katalog. Permintaan khusus perlu dibahas terlebih dahulu.</small>'+
        '</div>'+
        '<div class="ngdb-hero-visual"><img src="./assets/media/ngd-v8-video.webp" alt="Ilustrasi layanan produksi materi promosi digital" width="800" height="800" decoding="async"></div>'+
      '</header>'+
      '<section id="ngdb-packages" class="ngdb-packages" aria-labelledby="ngdb-packages-title">'+
        '<div class="ngdb-heading"><p class="ngdb-overline">HARGA NYATA, BUKAN TEBAK-TEBAKAN</p>'+
          '<h2 id="ngdb-packages-title">Paket yang dapat dipilih.</h2>'+
          '<p>Daftar dan harga ini diambil dari katalog. Untuk membeli, masuk atau daftar akun WhatsApp terlebih dahulu.</p></div>'+
        (packages?'<div class="ngdb-package-list">'+packages+'</div>':
         '<div class="ngdb-no-packages"><strong>Paket jasa belum dapat ditampilkan.</strong>'+
         '<p>Cek katalog untuk pilihan terbaru, atau masuk sebagai member untuk menyampaikan kebutuhan khusus.</p>'+
         '<button type="button" class="ngdb-button ngdb-outline" data-route="katalog">Buka Katalog</button></div>')+
      '</section>'+
      '<section class="ngdb-capabilities" aria-labelledby="ngdb-capabilities-title">'+
        '<div class="ngdb-heading"><p class="ngdb-overline">APA YANG BISA DIBANTU?</p>'+
          '<h2 id="ngdb-capabilities-title">Mulai dari pekerjaan yang paling menyita waktu.</h2></div>'+
        '<div class="ngdb-capability-list">'+examples.map(x=>
          '<article class="ngdb-capability"><img src="./assets/media/'+x[2]+'" alt="" loading="lazy" decoding="async">'+
            '<div><h3>'+x[0]+'</h3><p>'+x[1]+'</p></div></article>').join('')+'</div>'+
      '</section>'+
      '<section class="ngdb-process" aria-labelledby="ngdb-process-title">'+
        '<div class="ngdb-heading"><p class="ngdb-overline">CARA PESAN</p><h2 id="ngdb-process-title">Alurnya sederhana.</h2></div>'+
        '<div class="ngdb-process-steps">'+
          '<div><span>01</span><h3>Pilih paket</h3><p>Baca rincian layanan dan harga yang tersedia.</p></div>'+
          '<div><span>02</span><h3>Masuk sebagai member</h3><p>Daftar gratis dengan WhatsApp agar pesanan tercatat.</p></div>'+
          '<div><span>03</span><h3>Ikuti prosesnya</h3><p>Bayar jika checkout tersedia, lalu pantau status melalui akun.</p></div>'+
        '</div>'+
      '</section>'+
      '<footer class="ngdb-final"><div><h2>Pekerjaannya tidak cocok dengan paket yang ada?</h2>'+
        '<p>Member bisa mengirim brief untuk dibahas sebelum ada penawaran.</p></div>'+
        '<button type="button" class="ngdb-button ngdb-primary" data-service-request>Ajukan brief '+icon('arrow')+'</button>'+
      '</footer>'+
    '</div>';
  }
  return window.NGD_SERVICES_UI?
    window.NGD_SERVICES_UI.member({logged:logged()&&!isAdmin(),
      items:state.services,enabled:serviceWriteEnabled(),kind:state.serviceKind}):
    empty('Halaman Belum Tersedia','Coba muat ulang halaman.');
}
function viewAdminServices(){
  return window.NGD_SERVICES_UI?
    window.NGD_SERVICES_UI.admin({authorized:isAdmin(),items:state.services,
      enabled:serviceWriteEnabled(),selectedId:state.selectedServiceId}):
    empty('Halaman Belum Tersedia','Permintaan jasa belum bisa dimuat.');
}
function viewAdminOrders(){
  if(!isAdmin())return needLogin('pesanan admin');
  const rank={MENUNGGU_VERIFIKASI:0,EXPIRED:1,PENDING:2,PAID:3,FULFILLED:4,CANCELLED:5,REFUNDED:6};
  const rows=[...(state.adminOrders||[])].sort((a,b)=>
    (rank[a.status]??9)-(rank[b.status]??9)||
    new Date(b.created_at)-new Date(a.created_at));
  const waiting=rows.filter(o=>o.status==='MENUNGGU_VERIFIKASI').length;
  const financeBlocked=state.workspaceInfo&&(state.workspaceInfo.finance_enabled===false||state.workspaceInfo.mutations_enabled===false);
  return title('Cek Pembayaran','PEMBAYARAN',
    'Periksa dana masuk melalui mutasi rekening/e-wallet resmi sebelum menyetujui. Klaim Member bukan bukti pembayaran.')+
    '<p class="verification-count">'+waiting+' pesanan menunggu pemeriksaan</p>'+
    (financeBlocked?'<p class="admin-payment-notice">Konfirmasi pembayaran belum tersedia. Jangan tandai pesanan lunas.</p>':'')+
    (!rows.length?empty('Belum ada pesanan','Pesanan pelanggan akan muncul di sini.'):
    '<div class="admin-payment-list">'+rows.map(o=>{
      const status=String(o.status||'');
      const overdue=status==='PENDING'&&Number.isFinite(new Date(o.expires_at).getTime())&&new Date(o.expires_at).getTime()<=Date.now();
      const canReview=!financeBlocked&&(
        ['MENUNGGU_VERIFIKASI','EXPIRED'].includes(status)||overdue||
        (status==='PENDING'&&state.workspaceInfo?.manual_payment_direct_enabled===true));
      const reviewing=canReview&&state.adminPaymentReviewId===o.order_id;
      const note=status==='PENDING'?
        (overdue?'Batas pembayaran sudah lewat. Periksa pembayaran terlambat sebelum menindaklanjuti.':
        state.workspaceInfo?.manual_payment_direct_enabled===true?
        'Jika dana sudah diterima, Admin boleh melakukan verifikasi langsung dari mutasi meski Member belum menekan konfirmasi.':
        'Menunggu Member mengonfirmasi bahwa transfer sudah dikirim. Jangan setujui sebelum dana benar-benar masuk.'):
        status==='MENUNGGU_VERIFIKASI'?'Member mengaku sudah transfer. Periksa mutasi dana dengan nominal tepat, bukan screenshot atau klaim saja.':
        status==='EXPIRED'?'Order kedaluwarsa. Hanya verifikasi jika ada dana yang benar-benar telah diterima dan cocok.':
        status==='PAID'?'Pembayaran tercatat; periksa pemenuhan jika akses belum aktif.':
        status==='FULFILLED'?'Dana sudah diverifikasi dan pemenuhan tercatat.':'Tidak ada tindakan verifikasi pembayaran.';
      return '<article class="surface admin-payment-card">'+
        '<div class="admin-payment-head"><div><strong>'+esc(o.nama_produk||'Produk')+'</strong>'+
        '<small>'+esc(o.order_id)+' · Member '+esc(o.member_id)+'</small></div>'+safeBadge(status)+'</div>'+
        '<div class="admin-payment-amount"><span>Nominal yang harus cocok pada mutasi</span><strong>'+rupiah(o.total_bayar)+'</strong></div>'+
        '<p class="admin-payment-note">'+esc(note)+'</p>'+
        (canReview?
          '<div class="verification-actions">'+
          '<button type="button" class="btn btn-primary btn-sm" data-payment-open="'+esc(o.order_id)+'">'+
          (reviewing?'Tutup pemeriksaan':'Periksa dana &amp; tindak lanjuti')+'</button>'+
          (status==='MENUNGGU_VERIFIKASI'?'<button type="button" class="btn btn-secondary btn-sm" data-payment-admin="reject" data-order-id="'+esc(o.order_id)+'">Tolak konfirmasi</button>':'')+
          '</div>':'')+
        (reviewing?
          '<form id="admin-payment-form" class="admin-payment-form" autocomplete="off" data-order-id="'+esc(o.order_id)+'">'+
          '<h3>Cek Dana Masuk</h3><p>Cocokkan dana masuk di rekening resmi. Screenshot saja tidak cukup.</p>'+
          '<div class="field"><label for="admin-received-amount">Dana masuk (Rp)</label>'+
          '<input class="input" id="admin-received-amount" name="nominal_diterima" type="number" inputmode="numeric" min="1" step="1" required placeholder="Jumlah pada mutasi rekening"></div>'+
          '<div class="field"><label for="admin-payment-channel">Metode pembayaran</label>'+
          '<select class="input" id="admin-payment-channel" name="metode_diterima" required>'+
          '<option value="">Pilih sesuai bukti mutasi</option>'+
          '<option value="QRIS_STATIS">QRIS resmi</option>'+
          '<option value="TRANSFER_BANK">Transfer bank</option>'+
          '<option value="TRANSFER_EWALLET">Transfer e-wallet</option></select></div>'+
          '<div class="field"><label for="admin-settlement-ref">Nomor referensi transaksi</label>'+
          '<input class="input" id="admin-settlement-ref" name="referensi_pembayaran" required minlength="5" maxlength="120" placeholder="Nomor referensi / ID transaksi"></div>'+
          ((status==='EXPIRED'||overdue)?'<div class="field"><label for="admin-late-reason">Alasan pembayaran terlambat</label>'+
          '<textarea class="input" name="alasan" id="admin-late-reason" maxlength="300" minlength="5" rows="2" required placeholder="Jelaskan alasan keterlambatan"></textarea></div>':'')+
          '<label class="admin-payment-checkbox"><input type="checkbox" name="dana_diterima" autocomplete="off" required> Saya sudah memeriksa dana masuk sebesar '+rupiah(o.total_bayar)+' ke akun penerima resmi. Saya memahami sistem akan mengaktifkan produk dan mencatat komisi setelah persetujuan.</label>'+
          '<div class="verification-actions"><button type="submit" class="btn btn-primary" disabled>Lunas &amp; Aktifkan</button>'+
          '<button type="button" class="btn btn-secondary" data-payment-open="'+esc(o.order_id)+'">Batal</button></div>'+
          '</form>':'')+'</article>';
    }).join('')+'</div>');
}
function viewMembers(waiting=false){
  if(!isAdmin())return needLogin('data member admin');
  if(waiting){
    const rows=state.waitlist||[];
    return title('Daftar Tunggu','ADMIN MEMBER','Pendaftar yang belum mendapat akses.')+
      (rows.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Posisi</th><th>Nama & usaha</th><th>Tanggal</th></tr></thead><tbody>'+
      rows.map((m,i)=>'<tr><td>'+esc(m.posisi||i+1)+'</td><td>'+esc(m.nama)+'<span class="sub">'+esc(m.nama_usaha)+'</span></td><td>'+friendlyDate(m.joined_at)+'</td></tr>').join('')+
      '</tbody></table></div>':empty('Antrean kosong','Belum ada pendaftar menunggu.'));
  }
  const results=state.memberSearch,rows=results?.items||[];
  return title('Cari Pelanggan','MEMBER 360°','Cari berdasarkan nama, WhatsApp, atau produk.')+
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
      '<p class="tiny muted">'+esc((m.produk||[]).join(', ')||'Belum ada pembelian')+
      (m.akses_status?' · '+esc(m.akses_status):'')+'</p></div>'+
      '<div class="support-ticket-head">'+safeBadge(m.status)+
      '<button class="btn btn-secondary btn-sm" data-member-id="'+esc(m.member_id)+'">Lihat profil '+icon('arrow')+'</button></div></article>').join('')+'</div>':
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
  if(!logged())return '<div class="ngd-buyer-help">'+
    '<header class="ngdb-help-intro">'+
      '<p class="ngdb-overline">CARA KERJA & BANTUAN</p>'+
      '<h1>Sebelum pesan, boleh tahu dulu cara kerjanya.</h1>'+
      '<p>Cari tahu soal akun, pembayaran, dan cara menerima produk atau jasa. Baca dulu supaya tidak bingung setelah membeli.</p>'+
      '<div class="ngdb-actions"><button type="button" class="ngdb-button ngdb-primary" data-route="katalog">Lihat Katalog '+icon('arrow')+'</button>'+
        '<button type="button" class="ngdb-button ngdb-outline" data-route="login">Masuk / Daftar Member</button></div>'+
    '</header>'+
    '<section class="ngdb-help-steps" aria-labelledby="ngdb-help-steps-title">'+
      '<div class="ngdb-heading"><p class="ngdb-overline">TIGA LANGKAH</p><h2 id="ngdb-help-steps-title">Dari lihat-lihat sampai punya akses.</h2></div>'+
      '<div class="ngdb-process-steps">'+
        '<div><span>01</span><h3>Cek isi & harga</h3><p>Katalog bisa dibuka tanpa akun. Baca detail sebelum memilih.</p></div>'+
        '<div><span>02</span><h3>Masuk dengan WhatsApp</h3><p>Akun member diperlukan untuk membuat pesanan dan menyimpan akses.</p></div>'+
        '<div><span>03</span><h3>Bayar, lalu cek status</h3><p>Ikuti instruksi checkout yang tersedia. Akses mengikuti verifikasi pembayaran.</p></div>'+
      '</div>'+
    '</section>'+
    '<section class="ngdb-help-answers" aria-labelledby="ngdb-help-answers-title">'+
      '<div class="ngdb-heading"><p class="ngdb-overline">PERTANYAAN UMUM</p><h2 id="ngdb-help-answers-title">Yang biasanya ditanyakan.</h2></div>'+
      '<div class="ngdb-questions">'+
      [
        ['Harus daftar dulu untuk membeli?','Ya. Melihat katalog tidak perlu login, tetapi checkout dan akses produk memerlukan akun member yang terverifikasi. Daftar akun tidak dikenakan biaya.'],
        ['Bagaimana cara membayar?','Gunakan metode yang ditampilkan di halaman checkout saat pembayaran aktif. Jika QRIS DANA Bisnis tersedia, ikuti nominal dan instruksi pesanan. Jangan membayar dari QR yang dikirim di luar alur resmi.'],
        ['Setelah membayar, apakah akses langsung aktif?','Belum tentu. Pembayaran perlu diverifikasi sesuai proses yang berlaku. Status pesanan dan akses dapat diperiksa di akun member.'],
        ['Kalau ingin jasa yang berbeda dari paket?','Masuk sebagai member, buka menu Jasa, lalu kirim brief. Kebutuhan dan penawaran dibahas sebelum pengerjaan.'],
        ['Bagaimana kalau ada kendala pada pesanan?','Masuk ke akun member, buka Bantuan, lalu kirim laporan agar bisa dikaitkan dengan produk dan riwayat pesanan.']
      ].map(q=>'<details class="ngdb-question"><summary>'+esc(q[0])+'</summary><p>'+esc(q[1])+'</p></details>').join('')+
      '</div>'+
    '</section>'+
    '<footer class="ngdb-help-foot"><div><h2>Mau lihat-lihat dulu? Silakan.</h2>'+
      '<p>Mulai dari katalog, atau buka materi gratis kalau masih ingin belajar.</p>'+
      '<div class="ngdb-help-free"><a href="'+NGD_FREE_EBOOK_URL+'" target="_blank" rel="noopener noreferrer">Baca eBook Gratis ↗</a>'+
      '<a href="'+NGD_FREE_CLASSROOM_URL+'" target="_blank" rel="noopener noreferrer">Ikut Kelas Gratis ↗</a></div></div>'+
      '<button type="button" class="ngdb-button ngdb-primary" data-route="katalog">Buka Katalog '+icon('arrow')+'</button>'+
    '</footer>'+
  '</div>';
  if(isAdmin()){
    const overview=state.supportOverview||{},stats=overview.by_status||{},tickets=state.adminSupportTickets||[];
    return title('Pusat Bantuan','ADMIN / SUPPORT','Balas laporan dan pertanyaan pelanggan.')+
      '<div class="metric-grid">'+[
        ['Tiket keseluruhan',overview.total??0],
        ['Perlu triase',stats.OPEN??0],
        ['Prioritas tinggi',overview.urgent??0]
      ].map(([k,v])=>'<div class="metric-card static"><strong>'+esc(v)+'</strong><small>'+k+'</small></div>').join('')+'</div>'+
      '<div class="section-gap">'+title('Laporan Masuk','TIKET MASUK',
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
        empty('Belum ada tiket','Belum ada laporan masuk.'))+'</div>'+
      (overview.findings?.length?'<div class="banner warning section-gap"><div><h3>Perlu Ditindaklanjuti</h3><p>'+
        esc(overview.findings.length)+' potensi masalah riwayat/triase terdeteksi.</p></div></div>':'');
  }
  const list=state.supportTickets||[],releases=state.supportReleases||[];
  return title('Bantuan & Dukungan','RUANG MEMBER',
    'Laporkan kendala produk, usulkan fitur baru, dan pantau progres penanganan.')+
    '<div class="grid-2"><section class="surface"><p class="card-kicker">BUAT LAPORAN</p>'+
    '<form id="support-create-form" class="stack" autocomplete="off">'+
    '<div class="field"><label for="ticket-category">Jenis kendala</label><select id="ticket-category" class="input" name="kategori" required>'+
    '<option value="PERTANYAAN">Pertanyaan / bantuan akun</option><option value="BUG">Laporan bug</option><option value="FITUR">Permintaan fitur</option></select></div>'+
    '<div class="field"><label for="ticket-product">Produk terkait</label><select id="ticket-product" name="product_id" class="input">'+supportProductChoices()+'</select></div>'+
    '<div class="field"><label for="ticket-title">Judul</label><input id="ticket-title" class="input" name="judul" required minlength="8" maxlength="120" placeholder="Contoh: Struk tidak tercetak"></div>'+
    '<div class="field"><label for="ticket-detail">Ceritakan masalahnya</label><textarea id="ticket-detail" class="input" name="deskripsi" rows="5" required minlength="20" maxlength="2000" placeholder="Ceritakan apa yang terjadi, langkah reproduksi, dan hasil yang diharapkan. Jangan memasukkan PIN atau kata sandi."></textarea></div>'+
    '<div class="grid-2"><div class="field"><label for="ticket-platform">Perangkat</label><select class="input" name="platform" id="ticket-platform"><option value="ANDROID">Android</option><option value="WINDOWS">Windows</option><option value="WEB">Browser web</option><option value="LAINNYA">Lainnya</option></select></div>'+
    '<div class="field"><label for="ticket-version">Versi aplikasi (opsional)</label><input class="input" id="ticket-version" name="versi_aplikasi" placeholder="1.2.0" maxlength="32"></div></div>'+
    '<button type="submit" class="btn btn-primary btn-wide" '+(!supportWriteEnabled()?'disabled title="Fitur support belum diaktifkan"':'')+'>Kirim laporan '+icon('arrow')+'</button>'+
    '<p class="form-hint">Jangan tulis PIN atau data pembayaran pribadi.</p></form></section>'+
    '<section><div class="surface"><p class="card-kicker">RIWAYAT LAPORAN SAYA</p>'+
    (list.length?'<div class="stack">'+list.slice(0,8).map(supportTicketCard).join('')+'</div>':
      empty('Belum ada laporan','Laporan Anda akan muncul di sini.'))+'</div>'+
    '<div class="surface section-gap"><p class="card-kicker">UPDATE PRODUK SAYA</p>'+
    (releases.length?'<div class="stack">'+releases.slice(0,5).map(item=>'<div class="step"><span class="step-no">'+icon('check')+'</span><div class="step-body"><h3>'+
      esc(item.judul)+' · '+esc(item.versi)+'</h3><p>'+esc(item.ringkasan)+'</p><small class="muted">'+friendlyDate(item.published_at)+'</small></div></div>').join('')+'</div>':
      '<p class="card-desc">Kabar terbaru tentang produk Anda muncul di sini.</p>')+
    '</div></section></div>';
}
function viewTicketDetail(){
  if(!logged())return needLogin('detail tiket');
  const d=state.ticketDetail;
  if(!d||d.ticket?.ticket_id!==state.selectedTicketId)
    return title('Detail tiket','SUPPORT','Lihat pesan dan status laporan.')+
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
    '<p class="card-desc">Riwayat perubahan laporan tersimpan di sini.</p>'+
    (isAdmin()?'<div class="divider"></div><form id="ticket-status-form" class="stack">'+
      '<div class="field"><label for="ticket-next">Ubah status</label><select id="ticket-next" class="input" name="status" required>'+options.map(s=>'<option value="'+s+'">'+esc(supportStatusLabel(s))+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="ticket-note">Catatan penanganan</label><textarea id="ticket-note" name="catatan" class="input" minlength="8" maxlength="1000" rows="3" required></textarea></div>'+
      '<button class="btn btn-secondary" type="submit" '+(!supportWriteEnabled()||options.length===0?'disabled':'')+'>Simpan status</button></form>'+
      '<div class="divider"></div><form id="ticket-priority-form" class="stack">'+
      '<div class="field"><label for="ticket-priority">Tingkat prioritas</label><select id="ticket-priority" class="input" name="prioritas" required>'+
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
    return title('Member 360°','PUSAT LAYANAN','Lihat produk dan laporan pelanggan.')+
      empty('Belum Ada Profil Dipilih','Cari pelanggan untuk melihat detailnya.','member','Cari member');
  const m=d.profil,p=d.produk||[],orders=d.pesanan||[],tickets=d.tiket||[];
  return '<div class="section-head"><div><p class="eyebrow">MEMBER 360° · '+esc(m.member_id)+'</p><h2>'+esc(m.nama)+'</h2>'+
    '<p>'+esc(m.nama_usaha||'-')+' · '+esc(m.kota||'')+' · '+esc(m.wa||'')+'</p></div>'+safeBadge(m.status)+'</div>'+
    '<div class="metric-grid">'+[
      ['Produk terverifikasi',p.length],['Pesanan terbaru',orders.length],
      ['Tiket layanan',tickets.length]
    ].map(([label,value])=>'<div class="metric-card static"><strong>'+value+'</strong><small>'+label+'</small></div>').join('')+'</div>'+
    '<div class="section-gap">'+title('Akses Produk','PRODUK MEMBER','Menampilkan produk yang sudah aktif untuk pelanggan.')+
    (p.length?'<div class="grid-2">'+p.map(x=>'<article class="surface"><p class="card-kicker">'+esc(x.tipe)+'</p><h3>'+esc(x.nama)+'</h3>'+
      safeBadge(x.akses_status)+'<p class="card-desc" style="margin-top:14px">Order: '+esc(x.order_id)+
      (x.berakhir_at?' · Berakhir '+friendlyDate(x.berakhir_at):'')+'</p></article>').join('')+'</div>':
      empty('Belum ada pembelian','Belum ada pembelian yang selesai.'))+'</div>'+
    '<div class="grid-2 section-gap"><section>'+title('Riwayat tiket','CUSTOMER SUPPORT','')+
    (tickets.length?'<div class="stack">'+tickets.map(supportTicketCard).join('')+'</div>':empty('Belum ada tiket','Tidak ada laporan dari member ini.'))+'</section>'+
    '<section>'+title('Riwayat pesanan','PEMBELIAN','')+
    (orders.length?'<div class="surface list-rows">'+orders.map(o=>'<div class="list-row"><div><strong>'+esc(o.nama_produk||o.product_id)+'</strong>'+
      '<small>'+esc(o.order_id)+'</small></div>'+safeBadge(o.status)+'</div>').join('')+'</div>':
    empty('Belum ada pesanan','Belum ada pesanan pelanggan.'))+'</section></div>';
}
function viewReleases(){
  if(!logged())return needLogin('rilis produk');
  const data=state.supportReleases||[];
  return title('Pembaruan Produk','PEMBARUAN',
    isAdmin()?'Catat versi dan perubahan; publikasi hanya untuk member yang memiliki produk.':'Pembaruan resmi untuk produk yang Anda miliki.')+
    (isAdmin()?'<section class="surface" style="max-width:720px"><p class="card-kicker">TAMBAH PEMBARUAN</p>'+
      '<form id="release-create-form" class="stack"><div class="grid-2">'+
      '<div class="field"><label for="release-product">Produk</label><select class="input" name="product_id" id="release-product" required>'+state.catalog.map(p=>'<option value="'+esc(p.product_id)+'">'+esc(p.nama)+'</option>').join('')+'</select></div>'+
      '<div class="field"><label for="release-version">Versi baru</label><input class="input" name="versi" id="release-version" placeholder="1.2.1" pattern="v?[0-9]+\\.[0-9]+(\\.[0-9]+)?" required></div></div>'+
      '<div class="field"><label for="release-title">Judul rilis</label><input id="release-title" class="input" name="judul" required minlength="8" maxlength="120"></div>'+
      '<div class="field"><label for="release-summary">Rincian perubahan</label><textarea id="release-summary" class="input" name="ringkasan" required minlength="20" maxlength="1500" rows="4"></textarea></div>'+
      '<div class="field"><label for="release-type">Jenis pembaruan</label><select id="release-type" class="input" name="tipe_rilis"><option>PATCH</option><option>MINOR</option><option>MAJOR</option><option>NOTICE</option></select></div>'+
      '<button class="btn btn-primary" type="submit" '+(!supportWriteEnabled()?'disabled':'')+'>Simpan draft rilis</button></form>'+
      '<div class="divider"></div><p class="card-kicker">PENGGUNA TERDAMPAK</p>'+
      '<p class="card-desc">Periksa pelanggan terdampak sebelum menerbitkan perubahan.</p>'+
      '<button type="button" class="btn btn-secondary" data-impact-action="check" '+(!isConnected()?'disabled title="Fitur ini belum tersedia"':'')+'>Cek pelanggan terdampak</button>'+
      '<div id="release-impact-slot" style="margin-top:16px" aria-live="polite"></div>'+
      '<p class="form-hint">Draf baru terlihat setelah diterbitkan. Aplikasi terpasang tidak otomatis diperbarui.</p></section>':'')+
    '<div class="section-gap">'+title('Daftar versi','CHANGELOG','')+
    (data.length?'<div class="stack">'+data.map(item=>'<article class="surface support-release"><div class="support-ticket-head"><span class="chip">'+esc(item.tipe_rilis)+'</span>'+safeBadge(item.status)+'</div>'+
      '<h3>'+esc(item.judul)+' <span class="muted">'+esc(item.versi)+'</span></h3>'+
      '<p class="card-desc">'+esc(item.ringkasan)+'</p><p class="tiny muted">'+esc(item.product_id)+' · '+friendlyDate(item.published_at||item.created_at)+'</p>'+
      (isAdmin()&&item.status==='DRAFT'?'<button class="btn btn-secondary btn-sm" data-publish-release="'+esc(item.release_id)+'" '+(!supportWriteEnabled()?'disabled':'')+'>Publikasikan rilis</button>':'')+
      '</article>').join('')+'</div>':
      empty('Belum ada rilis','Pembaruan yang terbit muncul di sini.'))+'</div>';
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
  if(state.qa||!['beranda','katalog'].includes(state.route)||isAdmin()||state.heroPaused||
     heroFocused_||document.hidden||typeof setTimeout!=='function')return;
  const root=document.querySelector('[data-hero-carousel]');
  if(!root||root.querySelectorAll('[data-hero-panel]').length<2)return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
  heroTimer_=setTimeout(()=>{
    heroTimer_=null;
    if(['beranda','katalog'].includes(state.route)&&!state.heroPaused&&!heroFocused_&&!document.hidden){
      showHeroSlide_(state.heroIndex+1);
    }
    syncHeroRotation_();
  },6500);
}
function updateContentPreview_(){
  const form=document.getElementById('content-editor-form');
  if(!form)return;
  const src=window.NGD_CONTENT_UI?.mediaPath(form.querySelector('[name="image_path"]')?.value);
  const title=String(form.querySelector('[name="title"]')?.value||'Judul banner Anda');
  const kind=form.querySelector('[name="kind"]')?.value;
  const place=form.querySelector('[name="placement"]');
  if(kind&&place){
    let first='';
    for(const option of Array.from(place.options||[])){
      const valid=option.dataset.contentKind===kind;
      option.hidden=!valid;option.disabled=!valid;
      if(valid&&!first)first=option.value;
    }
    if(place.selectedOptions?.[0]?.disabled&&first)place.value=first;
  }
  form.querySelectorAll('[data-content-preview-title]').forEach(node=>{node.textContent=title;});
  form.querySelectorAll('[data-content-preview-image]').forEach(img=>{
    if(src){img.src=src;img.hidden=false;}
    else {img.hidden=true;img.removeAttribute('src');}
  });
}
document.addEventListener('input',e=>{
  if(e.target?.closest?.('#content-editor-form')&&
     ['content-kind','content-placement','content-image','content-title'].includes(e.target?.id))
    updateContentPreview_();
});
document.addEventListener('change',e=>{
  if(e.target?.id==='content-kind')updateContentPreview_();
});
async function submitContentForm_(form){
  if(!isAdmin()||!contentWriteEnabled())return toast('Edit konten belum tersedia.',true);
  const fd=new FormData(form),id=String(form.dataset.contentId||'');
  const payload={};
  for(const key of ['kind','placement','title','description','image_path',
    'cta_label','cta_route','sort_order','start_date','end_date']){
    payload[key]=String(fd.get(key)||'').trim();
  }
  payload.sort_order=Number(payload.sort_order);
  const old=id?state.adminContent.find(x=>x.content_id===id):null;
  if(id&&!old)return toast('Konten berubah. Muat ulang halaman.',true);
  if(old){
    if(old.status==='PUBLISHED')
      return toast('Tarik tayang konten terlebih dahulu sebelum mengedit. Ini mencegah perubahan live tanpa persetujuan publikasi ulang.',true);
    payload.content_id=id;payload.revision=old.revision;
  }
  if(!(payload.kind==='PROMO'||payload.kind==='ANNOUNCEMENT')||payload.image_path){
    if(!window.NGD_CONTENT_UI?.mediaPath(payload.image_path))
      return toast('Gunakan URL HTTPS gambar atau path assets/ (PNG, JPG, WebP, AVIF).',true);
  }
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
    render();toast('Konten disimpan. Periksa sebelum tayang.');
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
  if(nextStatus==='PUBLISHED'){
    if(!['HERO','PRODUCT_IMAGE','FEATURE_ICON','PAGE_COVER','NAV_ICON','BRAND_LOGO','PROMO','ANNOUNCEMENT'].includes(old.kind))
      return toast('Format konten lama tidak dapat diterbitkan. Buat konten baru dengan jenis yang didukung.',true);
    const src=window.NGD_CONTENT_UI?.mediaPath(old.image_path);
    if(!src&&['PROMO','ANNOUNCEMENT'].includes(old.kind)){
      if(!confirm('Terbitkan '+(old.kind==='PROMO'?'promosi':'pengumuman')+' tanpa gambar?'))return;
    }else if(!src)return toast('Alamat gambar tidak valid.',true);
    // A valid path is not evidence that a file exists: verify the image loads
    // before a published CMS row can replace the homepage or product image.
    const reachable=!src?true:await new Promise(resolve=>{
      const img=new Image();
      const guard=setTimeout(()=>{img.onload=null;img.onerror=null;resolve(false);},8000);
      img.onload=()=>{clearTimeout(guard);resolve(img.naturalWidth>0);};
      img.onerror=()=>{clearTimeout(guard);resolve(false);};
      img.src=src;
    });
    if(!reachable)return toast('Gambar tidak bisa dibuka. Periksa alamatnya.',true);
    if(src&&!confirm('Gambar berhasil dibuka. Terbitkan konten ini sekarang?'))return;
  }
  try{
    await api('adminSetContentStatus',{
      content_id:id,status:nextStatus,revision:old.revision
    },state.token,{write:true});
    state.adminContent=await api('adminListContent',{},state.token);
    render();toast(nextStatus==='PUBLISHED'?'Konten sudah tayang.':'Status berhasil diubah.');
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
    beranda:viewHome,belajar:viewLearn,katalog:viewCatalog,ai:viewAI,'ai-tool':viewAITool,affiliate:viewAffiliate,menu:viewMore,
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
  const routeBlocked=adminOnlyRoutes.has(state.route)&&!isAdmin();
  const adminOutOfScope=isAdmin()&&!adminOnlyRoutes.has(state.route)&&!['beranda','menu','pesanan','dukungan','akun','tiket','member360','rilis','admin-login'].includes(state.route);
  const screen=routeBlocked?
    '<section class="ngd-role-gate"><p class="eyebrow">AKSES TERBATAS</p><h1>Halaman khusus pengelola.</h1><p>Konten ini tidak tersedia dalam ruang publik atau member. Kembali ke area yang sesuai dengan akun Anda.</p><button type="button" class="btn btn-primary" data-route="beranda">Kembali ke Beranda</button></section>':
    adminOutOfScope?
    '<section class="ngd-role-gate"><p class="eyebrow">RUANG PENGELOLA</p><h1>Anda berada di mode Admin.</h1><p>Untuk mengelola produk dan pesanan, gunakan modul Admin. Etalase pembeli tidak ditampilkan dalam ruang operasional.</p><button type="button" class="btn btn-primary" data-route="admin">Kembali ke Panel Admin</button></section>':
    (routes[state.route]||viewHome)();
  // Catalog has a single authoritative HERO slot; do not stack PAGE_COVER above it.
  by('screen').innerHTML=screen;
  syncCheckoutClock_();
  syncHeroRotation_();
  syncMarketplacePolling_();
  document.title=(screens[state.route]?.[0]||'Beranda')+' — Ngulik Digital';
}
// Navigation is a small predictable state machine. A product checkout can be
// bookmarked, and Android/browser Back returns to the previous screen.
let lastRouteHash_=location.hash;
const guestPrivateRoutes_=new Set(['ai','ai-tool','belajar','lms-course','lms-complete','affiliate','pesanan','checkout','akun','layanan']);
function guestRoute_(route){
  if(!logged()&&!isAdmin()&&guestPrivateRoutes_.has(route)){
    if(route==='checkout'&&state.checkoutProductId)state.pendingPurchaseId=state.checkoutProductId;
    return 'login';
  }
  return route;
}
function go(route){
  if(route==='menu')route='beranda';
  route=guestRoute_(route);
  if(!screens[route])route='beranda';
  state.route=route;
  const fragment=route==='ai-tool'?aiToolRoute_(state.selectedAiToolId):
    route==='checkout'&&!state.lastOrder&&/^[A-Za-z0-9_-]{1,100}$/.test(String(state.checkoutProductId||''))?
      'checkout/'+encodeURIComponent(state.checkoutProductId):route;
  const next='#'+fragment;
  if(location.hash!==next){
    if(typeof history.pushState==='function')history.pushState(null,'',next);
    else history.replaceState(null,'',next); // offline/legacy preview harness
  }
  lastRouteHash_=location.hash;
  render();window.scrollTo({top:0,behavior:'auto'});loadRoute(route);
}
async function refreshPublic(){
  if(state.qa||!isConnected())return;
  // Independent public reads must not discard a valid catalogue when the
  // metadata service is briefly unavailable (or vice versa).
  const [info,catalog,content,publicTools]=await Promise.allSettled([
    api('getPublicInfo'),api('getKatalog'),api('getPublicContent'),api('getPublicTools')]);
  if(info.status==='fulfilled'&&info.value&&typeof info.value==='object')state.info=info.value;
  if(catalog.status==='fulfilled'&&Array.isArray(catalog.value))state.catalog=catalog.value;
  if(content.status==='fulfilled'&&Array.isArray(content.value))state.siteContent=content.value;
  if(publicTools.status==='fulfilled'&&Array.isArray(publicTools.value)){
    state.publicTools=publicTools.value;state.publicToolsLoaded=true;
  }else state.publicToolsLoaded=true;
  render();
  if(info.status==='rejected'&&catalog.status==='rejected')
    toast('Informasi terbaru belum dapat dimuat. Coba muat ulang halaman.',true);
}
// Near-real-time sync: two read-only GAS calls while the catalogue is visible.
// No order creation, member data access, or mutations.
let marketplacePoll_=null,marketplaceUpdating_=false;
async function refreshMarketplaceData_(){
  if(marketplaceUpdating_||state.qa||!isConnected())return false;
  marketplaceUpdating_=true;
  try{
    const [catalog,content]=await Promise.allSettled([
      api('getKatalog'),api('getPublicContent')
    ]);
    const okCatalog=catalog.status==='fulfilled'&&Array.isArray(catalog.value);
    const okContent=content.status==='fulfilled'&&Array.isArray(content.value);
    if(okCatalog)state.catalog=catalog.value;
    if(okContent)state.siteContent=content.value;
    if(state.route==='katalog'&&(okCatalog||okContent))render();
    // Catalog refresh succeeds even when optional CMS images are temporarily unavailable.
    return okCatalog;
  }finally{marketplaceUpdating_=false;}
}
function syncMarketplacePolling_(){
  if(marketplacePoll_!==null&&typeof clearInterval==='function'){
    clearInterval(marketplacePoll_);marketplacePoll_=null;
  }
  if(state.route!=='katalog'||state.qa||!isConnected()||
    typeof setInterval!=='function')return;
  marketplacePoll_=setInterval(()=>{
    if(document.hidden||marketplaceUpdating_)return;
    void refreshMarketplaceData_().catch(()=>{});
  },90000);
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
      clearPrivateCommandCenter_();
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
    if(route==='checkout'&&!isAdmin()&&String(config.brand||'').includes('STAGING')){
      try{state.workspaceInfo=await api('getStagingWorkspaceInfo');}catch{state.workspaceInfo=null;}
    }
    if(route==='beranda'&&!isAdmin()){
      // Member command center: every metric comes from a real backend read.
      // Partial failures preserve other sections, but never fabricate records.
      const tasks=await Promise.allSettled([
        api('getBeranda',{},token),api('listMyOrders',{},token),
        api('getAffiliateDashboard',{},token),api('getMyProducts',{},token),
        api('getKreditRiwayat',{},token),api('getMyLMSEnrollments',{},token)
      ]);
      if(tasks[0].status==='fulfilled')state.home=tasks[0].value;
      if(tasks[1].status==='fulfilled')state.orders=tasks[1].value||[];
      if(tasks[2].status==='fulfilled')state.affiliates=tasks[2].value||null;
      if(tasks[3].status==='fulfilled')state.memberProducts=tasks[3].value||[];
      if(tasks[4].status==='fulfilled')state.creditHistory=tasks[4].value?.riwayat||[];
      if(tasks[5].status==='fulfilled')state.lmsEnrollments=tasks[5].value||[];
      if(tasks.every(t=>t.status==='rejected'))throw tasks[0].reason;
    }
    if(route==='ai'||route==='ai-tool'){
      // Independent reads: two GAS calls in parallel without losing the
      // successful result when the other service is temporarily unavailable.
      const [homeResult,toolsResult]=await Promise.allSettled([
        api('getBeranda',{},token),api('getTools',{},token)
      ]);
      if(homeResult.status==='fulfilled')state.home=homeResult.value;
      if(toolsResult.status==='fulfilled')state.tools=toolsResult.value?.tools||[];
      if(homeResult.status==='rejected'&&toolsResult.status==='rejected')
        throw toolsResult.reason;
    }
    if(route==='katalog'&&!isAdmin()){
      // STAGING provider readiness comes from the backend, never a URL param.
      // A failed read must hide all Mayar checkout actions.
      if(location.pathname.includes('/staging/')){
        try{state.workspaceInfo=await api('getStagingWorkspaceInfo');}
        catch(e){state.workspaceInfo=null;}
      }
      // Member shelf is read-only and never launches internal checkout.
      try{state.partnerShelf=await api('getEtalase',{},token);state.partnerShelfLoaded=true;}
      catch(e){state.partnerShelfLoaded=true;state.partnerShelf=[];}
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
    if(route==='konten'&&isAdmin()){
      state.adminContent=await api('adminListContent',{},token);
      if(state.contentPresetProductId){
        const photo=state.adminContent.find(x=>x.kind==='PRODUCT_IMAGE'&&
          x.placement===state.contentPresetProductId&&x.status!=='ARCHIVED');
        state.contentEditId=photo?.content_id||'';
      }
    }
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
        // Reconciliation is not displayed on this page; avoid an extra GAS
        // execution and spreadsheet scan on every visit.
        const [ordersResult,workspaceResult]=await Promise.allSettled([
          api('adminListOrders',{},token),
          api('getStagingWorkspaceInfo')
        ]);
        if(ordersResult.status==='fulfilled')state.adminOrders=ordersResult.value||[];
        else throw ordersResult.reason;
        if(workspaceResult.status==='fulfilled')state.workspaceInfo=workspaceResult.value;
        else state.workspaceInfo=null;
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
    return toast('Nomor WhatsApp tidak valid.',true);
  if(action==='otp-request'&&!agreed)
    return toast('Centang persetujuan terlebih dahulu.',true);
  if(action==='otp-verify'&&!/^[0-9]{6}$/.test(otp))
    return toast('Masukkan kode WhatsApp 6 angka.',true);
  const button=form.querySelector('[data-action="'+action+'"]');
  if(button)button.disabled=true;
  try{
    if(action==='otp-request'){
      state.registrationOtpVerifiedWa='';
      await api('requestRegistrationOtp',{wa,setuju_kebijakan:agreed},'',{write:true});
      toast('Kode dikirim. Cek WhatsApp Anda.');
    }else if(action==='otp-verify'){
      const result=await api('verifyRegistrationOtp',{wa,otp},'',{write:true});
      if(result?.verified!==true)
        throw new ApiError('Verifikasi OTP belum dikonfirmasi backend.');
      state.registrationOtpVerifiedWa=wa;
      toast('Nomor terverifikasi. Lanjutkan pendaftaran.');
    }
  }catch(error){toast(error.message,true);}
  finally{if(button)button.disabled=false;}
}
async function requestMemberLoginOtp_(){
  const form=document.getElementById('auth-form');
  if(!form || form.dataset.mode!=='login' || !memberOtpLoginEnabled())
    return toast('Login WhatsApp belum tersedia.',true);
  const fd=new FormData(form),wa=String(fd.get('wa')||'').trim();
  if(!/^(?:0|[+]?62)[0-9]{8,13}$/.test(wa.replace(/[ ()-]/g,'')))
    return toast('Nomor WhatsApp tidak valid.',true);
  if(fd.get('setuju_pengiriman')!=='on')
    return toast('Centang persetujuan kirim kode.',true);
  const btn=form.querySelector('[data-action="member-otp-request"]');
  if(btn)btn.disabled=true;
  try{
    const res=await api('requestMemberLoginOtp',{wa,setuju_pengiriman:true},'',{write:true});
    if(res?.accepted!==true)throw new ApiError('Permintaan OTP belum dikonfirmasi.');
    toast('Jika terdaftar, kode akan dikirim ke WhatsApp.');
  }catch(e){toast(e.message,true);}
  finally{if(btn)btn.disabled=false;}
}
async function processLogin(form,register){
  const adminMode=form.dataset.mode==='admin';
  if(!(adminMode?adminLoginEnabled():register?registrationOtpEnabled():memberOtpLoginEnabled()))
    return toast(adminMode?'Login administrator belum diaktifkan.':register?
      'Pendaftaran OTP belum dibuka.':'Login member menggunakan OTP WhatsApp; layanan ini belum diaktifkan.',true);
  const fd=new FormData(form);
  const otpLogin=!adminMode&&!register&&memberOtpLoginEnabled();
  const payload=otpLogin?
    {wa:String(fd.get('wa')||''),otp:String(fd.get('otp')||'').trim()}:
    {wa:String(fd.get('wa')||''),pin:String(fd.get('pin')||'')};
  if(otpLogin && (!/^[0-9]{6}$/.test(payload.otp)||fd.get('setuju_pengiriman')!=='on'))
    return toast('Masukkan OTP enam angka dan setujui pengiriman WhatsApp.',true);
  if(register){
    payload.nama=String(fd.get('nama')||'');
    payload.nama_usaha=String(fd.get('nama_usaha')||'');
    payload.setuju_kebijakan=fd.get('setuju_kebijakan')==='on';
    payload.otp=String(fd.get('otp')||'').trim();
    if(!registrationOtpEnabled())return toast('Registrasi OTP belum diaktifkan.',true);
    if(!/^[0-9]{6}$/.test(payload.otp)||state.registrationOtpVerifiedWa!==payload.wa)
      return toast('Verifikasi kode OTP WhatsApp terlebih dahulu.',true);
    const r=captureFirstInviter_();
    if(r)payload.ref=r;
  }
  const btn=form.querySelector('[type=submit]');btn.disabled=true;
  try{
    const response=await api(adminMode?'adminLogin':register?'register':otpLogin?'verifyMemberLoginOtp':'login',
      payload,'',{write:true,adminAuth:adminMode});
    const result=register?response.sesi:response;
    if(adminMode&&result?.profil?.role!=='ADMIN')
      throw new ApiError('Akses administrator ditolak.','FORBIDDEN');
    if(register&&response.status==='WAITING_LIST'){
      state.registrationOtpVerifiedWa='';
      state.registrationWaitlist={posisi:response.posisi};
      go('daftar');
      toast('Pendaftaran diterima. Tunggu kabar aktivasi.');
      return;
    }
    if(!result?.token||!result?.profil)throw new ApiError('Respons login belum lengkap.');
    state.token=result.token;state.me=result.profil;
    sessionStorage.setItem(tokenKey,result.token);
    toast('Selamat datang!');
    const resume=(!isAdmin()&&state.pendingPurchaseId)?state.pendingPurchaseId:'';
    const resumeService=!isAdmin()&&state.pendingServiceRequest===true;
    state.pendingPurchaseId='';state.pendingServiceRequest=false;
    if(resume){openProductCheckout_(resume);}
    else go(isAdmin()?'admin':resumeService?'jasa':'beranda');
  }catch(e){toast(e.message,true);}finally{btn.disabled=false;}
}
function clearPrivateCommandCenter_(){
  state.home=null;state.orders=[];state.creditHistory=[];state.affiliates=null;
  state.memberProducts=[];state.lmsEnrollments=[];state.notifications={enabled:false,items:[],unread:0};
}
async function logout(){
  const token=state.token,wasAdmin=isAdmin();
  state.token='';state.me=null;state.pendingPurchaseId='';state.pendingServiceRequest=false;sessionStorage.removeItem(tokenKey);
  clearPrivateCommandCenter_();
  go('beranda');
  if(token&&isConnected()){
    try{await api(wasAdmin?'adminLogout':'logout',{},token,
      {write:true,adminAuth:wasAdmin});}catch{}
  }
  toast('Anda sudah keluar.');
}
async function changeAdminPin_(form){
  if(!isAdmin()||!adminLoginEnabled())return toast('Perubahan PIN belum tersedia.',true);
  const fd=new FormData(form);
  const oldPin=String(fd.get('pin_lama')||''),newPin=String(fd.get('pin_baru')||'');
  const confirmation=String(fd.get('pin_konfirmasi')||'');
  if(!/^\d{6}$/.test(oldPin)||!/^\d{6}$/.test(newPin)||oldPin===newPin)
    return toast('Masukkan PIN lama dan PIN baru enam angka yang berbeda.',true);
  if(newPin!==confirmation)
    return toast('PIN baru tidak cocok.',true);
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
    toast('PIN berhasil diganti. Silakan masuk lagi.');
  }catch(error){toast(error.message,true);if(button)button.disabled=false;}
}
let checkoutSubmitting_=false;
async function buy(productId){
  if(!logged()){
    state.pendingPurchaseId=productId;
    go('login');return;
  }
  if(!checkoutQrReady_()){toast('QRIS belum diverifikasi atau pembayaran belum aktif.',true);return;}
  if(isAdmin())return toast('Checkout hanya untuk member.',true);
  const product=state.catalog.find(p=>p.product_id===productId);
  if(!product)return toast('Produk tidak ditemukan.',true);
  if(!supportedSaleTypes.has(String(product.tipe))||!(moneyValue(product.harga)>0))
    return toast('Produk belum bisa diproses sebagai pesanan berbayar.',true);
  if(!confirm('Buat pesanan '+product.nama+'? Nominal akhir termasuk kode unik ditentukan oleh server.'))return;
  if(checkoutSubmitting_)return;
  checkoutSubmitting_=true;
  const button=document.querySelector('[data-checkout-create]');
  if(button)button.disabled=true;
  try{
    const requestId=state.checkoutRequestId||createRequestId();
    state.checkoutRequestId=requestId;
    const order=await api('createOrder',{product_id:productId},state.token,{write:true,requestId});
    if(!order?.order_id)throw new ApiError('Respons pesanan tidak lengkap. Periksa riwayat sebelum mencoba kembali.');
    state.checkoutRequestId=null;state.checkoutReturnRoute='pesanan';state.orderDetailLoading=false;state.lastOrder=order;go('checkout');toast('Pesanan berhasil dibuat.');
  }catch(e){toast(e.message,true);if(button?.isConnected)button.disabled=false;}
  finally{checkoutSubmitting_=false;}
}
async function openOrderDetail_(id){
  if(!logged()||isAdmin())return toast('Masuk sebagai Member untuk melihat pesanan.',true);
  const known=state.orders.find(o=>o.order_id===id);
  if(!known)return toast('Pesanan tidak ditemukan. Muat ulang riwayat.',true);
  // Show a safe preview immediately. Never enable payment controls with stale data.
  state.checkoutReturnRoute='pesanan';state.lastOrder=known;
  state.orderDetailLoading=true;
  go('checkout');
  try{
    const current=await api('getOrder',{order_id:id},state.token);
    if(!current||current.order_id!==id)throw new ApiError('Rincian pesanan tidak valid.');
    if(state.lastOrder?.order_id!==id)return;
    state.lastOrder=current;state.orderDetailLoading=false;
    if(state.route==='checkout')render();
  }catch(error){
    if(state.lastOrder?.order_id===id){
      state.orderDetailLoading=false;
      if(state.route==='checkout')go('pesanan');
    }
    toast('Belum bisa memeriksa pesanan: '+(error.message||'Coba lagi.'),true);
  }
}
function syncAdminPaymentApproval_(){
  const form=document.getElementById('admin-payment-form');
  if(!form)return;
  const button=form.querySelector('button[type="submit"]');
  if(!button)return;
  const order=state.adminOrders.find(o=>o.order_id===form.dataset.orderId);
  const amount=Number(form.elements.namedItem('nominal_diterima')?.value);
  const expected=Number(order?.total_bayar);
  const method=String(form.elements.namedItem('metode_diterima')?.value||'');
  const proof=String(form.elements.namedItem('referensi_pembayaran')?.value||'').trim();
  const reasonInput=form.elements.namedItem('alasan');
  const reasonOk=!reasonInput||String(reasonInput.value||'').trim().length>=5;
  const checked=form.elements.namedItem('dana_diterima')?.checked===true;
  button.disabled=adminPaymentSubmitting_||!order||!Number.isSafeInteger(amount)||
    amount<=0||amount!==expected||
    !['QRIS_STATIS','TRANSFER_BANK','TRANSFER_EWALLET'].includes(method)||
    proof.length<5||proof.length>120||!reasonOk||!checked;
}
let adminPaymentSubmitting_=false;
async function submitAdminPaymentForm_(form){
  if(adminPaymentSubmitting_||!isAdmin()||!paymentEnabled()||
    state.workspaceInfo?.finance_enabled===false||state.workspaceInfo?.mutations_enabled===false)
    return toast('Cek Pembayaran Admin belum diaktifkan.',true);
  const id=String(form.dataset.orderId||'');
  const order=state.adminOrders.find(o=>o.order_id===id);
  const overdue=order&&order.status==='PENDING'&&Number.isFinite(new Date(order.expires_at).getTime())&&new Date(order.expires_at).getTime()<=Date.now();
  if(!order||(!['MENUNGGU_VERIFIKASI','EXPIRED'].includes(String(order.status))&&!overdue&&
    !(order.status==='PENDING'&&state.workspaceInfo?.manual_payment_direct_enabled===true)))
    return toast('Order belum diajukan untuk verifikasi atau belum kedaluwarsa. Minta Member mengonfirmasi pembayaran terlebih dahulu.',true);
  const fd=new FormData(form);
  const received=Number(fd.get('nominal_diterima'));
  const expected=Number(order.total_bayar);
  const proof=String(fd.get('referensi_pembayaran')||'').trim();
  const method=String(fd.get('metode_diterima')||'');
  const reason=String(fd.get('alasan')||'').trim();
  if(!Number.isSafeInteger(received)||!Number.isSafeInteger(expected)||
     received!==expected||received<=0)
    return toast('Jumlah yang diterima harus sama persis dengan tagihan '+rupiah(expected)+'.',true);
  if(!['QRIS_STATIS','TRANSFER_BANK','TRANSFER_EWALLET'].includes(method))
    return toast('Pilih metode pembayaran yang benar-benar diterima.',true);
  if(proof.length<5||proof.length>120)
    return toast('Isi referensi mutasi yang valid (5–120 karakter).',true);
  if((order.status==='EXPIRED'||overdue)&&reason.length<5)
    return toast('Jelaskan alasan rekonsiliasi pembayaran terlambat.',true);
  if(fd.get('dana_diterima')!=='on')
    return toast('Verifikasi dana masuk harus dikonfirmasi Admin.',true);
  if(!confirm('KONFIRMASI FINAL: dana '+rupiah(expected)+' melalui '+method+' BENAR-BENAR masuk ke penerima resmi untuk order '+id+
    '. Setelah disetujui, sistem akan menerbitkan token/akses dan memproses notifikasi serta komisi. Lanjutkan?'))return;
  adminPaymentSubmitting_=true;
  const submit=form.querySelector('[type="submit"]');
  if(submit)submit.disabled=true;
  try{
    const saved=await api('adminVerifyOrder',{
      order_id:id,keputusan:'approve',dana_diterima:true,
      referensi_pembayaran:proof,alasan:reason,nominal_terverifikasi:received,
      metode_diterima:method
    },state.token,{write:true});
    if(saved?.needs_review){
      toast('Pembayaran tercatat, tetapi pemenuhan produk perlu rekonsiliasi Admin. Jangan approve ulang.',true);
    }else if(saved?.status==='PAID'||saved?.status==='FULFILLED'){
      toast(saved.status==='FULFILLED'?
        'Dana diverifikasi. Produk/token diproses dan notifikasi lunas dijalankan.':
        'Dana diverifikasi. Pemenuhan produk masih perlu pemeriksaan.');
    }else{
      toast('Respons verifikasi belum pasti. Periksa status order, jangan ulangi pembayaran.',true);
    }
    state.adminPaymentReviewId='';
    await loadRoute('pesanan');
  }catch(e){
    toast((e?.message||'Gagal memverifikasi.')+' Periksa mutasi dan status order sebelum mencoba lagi.',true);
    if(submit?.isConnected)submit.disabled=false;
  }finally{adminPaymentSubmitting_=false;}
}
let memberConfirmSubmitting_=false;
async function confirmPayment(){
  const order=state.lastOrder;
  if(memberConfirmSubmitting_)return;
  if(!logged()||isAdmin()||!order||!paymentEnabled()||
    state.workspaceInfo?.finance_enabled===false||state.workspaceInfo?.mutations_enabled===false)
    return toast('Konfirmasi pembayaran belum tersedia.',true);
  if(order.status!=='PENDING')
    return toast('Pesanan ini tidak lagi menunggu konfirmasi. Buka ulang detailnya.',true);
  const expiry=new Date(order.expires_at).getTime();
  if(!Number.isFinite(expiry)||expiry<=Date.now())
    return toast('Batas pembayaran terlewati. Hubungi Admin jika sudah membayar.',true);
  const qrRaw=String(config.qrisOwnerImageApproved===true
    ?config.qrisImageUrl:(order.qris_gambar_path||config.qrisImageUrl||''));
  const placeholder=config.qrisOwnerImageApproved!==true||
    /(?:^|\/)assets\/qris\.png(?:$|[?#])/i.test(qrRaw);
  const officialQr=Boolean(qrRaw&&!placeholder&&order.metode==='QRIS_STATIS');
  if(!officialQr&&order.metode==='QRIS_STATIS')
    return toast('QRIS resmi belum diverifikasi untuk pembayaran. Jangan transfer.',true);
  const img=document.querySelector('[data-qris-image]');
  if(officialQr&&img&&(!img.complete||!img.naturalWidth))
    return toast('QRIS belum berhasil ditampilkan. Hubungi Admin untuk pembayaran manual.',true);
  const evidenceText='Saya sudah BENAR-BENAR membayar '+rupiah(order.total_bayar)+
    ' melalui QRIS DANA Bisnis Linggau AI Studio untuk order '+order.order_id+
    '. Saya paham konfirmasi ini BUKAN bukti dana diterima dan token belum otomatis ditambahkan. '+
    'Admin akan mencocokkan mutasi pembayaran. Lanjutkan permintaan verifikasi?';
  if(!confirm(evidenceText))return;
  memberConfirmSubmitting_=true;
  const btn=document.querySelector('[data-action="confirm-payment"]');
  if(btn)btn.disabled=true;
  try{
    const result=await api('confirmPayment',{order_id:order.order_id},state.token,{write:true});
    if(!result||!['MENUNGGU_VERIFIKASI','PAID','FULFILLED'].includes(result.status))
      throw new ApiError('Status konfirmasi belum pasti. Periksa riwayat pesanan sebelum mencoba lagi.');
    state.lastOrder=result;
    toast('Konfirmasi diterima. Admin akan cek pembayaran.');
    go('pesanan');
  }catch(e){
    toast(e.message||'Konfirmasi belum dapat diproses. Periksa status pesanan.',true);
    if(btn?.isConnected)btn.disabled=false;
  }finally{memberConfirmSubmitting_=false;}
}
// A write may succeed on Apps Script even when its response is lost.
// Keep the same opaque request ID for an identical retry until confirmed.
const pendingSupportRequests = new Map();
async function submitSupportAction(form,action,payload,after){
  if(!supportWriteEnabled()){
    toast('Bantuan belum tersedia. Coba lagi nanti.',true);return;
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
  toast('Permintaan berhasil dikirim.');
  if(after){
    try{await after(result);}
    catch(e){toast('Data disimpan. Muat ulang untuk melihatnya.',true);}
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
    else toast('Belum bisa memastikan perubahan. Periksa data sebelum mencoba lagi.',true);
    if(button)button.disabled=false;
    return;
  }
  if(button)button.disabled=false;
  toast('Materi berhasil disimpan.');
  if(after)try{await after(result);}catch(err){toast('Perubahan tersimpan. Muat ulang halaman.',true);}
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
    return toast('Permintaan jasa belum tersedia.',true);
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
    return toast('Anggaran harus berupa angka bulat.',true);
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
  toast(saved.already_submitted?'Permintaan sudah dikirim.':'Permintaan berhasil dikirim.');
  try{state.services=await api('getMyServiceRequests',{},state.token);}
  catch(error){toast('Permintaan tersimpan. Muat ulang riwayat.',true);}
  render();
}
async function submitServiceQuote(form){
  if(!isAdmin()||!serviceWriteEnabled())return toast('Penawaran belum tersedia.',true);
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
  catch(error){toast('Perubahan tersimpan. Muat ulang daftar.',true);}
  render();
}
document.addEventListener('error',(event)=>{
  const img=event.target;
  if(img?.tagName!=='IMG')return;
  if(img.classList?.contains('ngd-home-artwork')){
    const fallback=String(img.dataset?.homeFallback||'');
    if(fallback&&img.dataset.homeRecovered!=='1'){
      img.dataset.homeRecovered='1';img.src=fallback;
    }else img.hidden=true;
    return;
  }
  if(img.closest?.('.ngd-catalog-campaign-picture')){
    // CMS URLs can disappear after publication. Recover to the vetted local
    // wide artwork once, preserving the Admin-authored text and CTA.
    if(img.dataset?.campaignRecovered==='1'){img.hidden=true;return;}
    img.dataset.campaignRecovered='1';
    const root=String(window.location?.pathname||'').includes('/staging/')?'../':'./';
    img.src=root+'assets/media/ngd-catalog-v9-wide.webp';
    return;
  }
  if(!img.classList?.contains('market-product-image'))return;
  const fallback=String(img.dataset?.marketFallback||'');
  if(fallback&&img.dataset.marketFallbackUsed!=='1'){
    img.dataset.marketFallbackUsed='1';
    img.src=fallback;
    return;
  }
  // Do not show a raw alt string across the product photo slot.
  img.classList.add('ngd-image-unavailable');
},true);
document.addEventListener('submit',(e)=>{
  if(e.target?.id!=='guest-header-search-form')return;
  e.preventDefault();
  if(isAdmin())return;
  const query=String(e.target.elements?.namedItem?.('query')?.value||'').trim().slice(0,80);
  state.marketplaceSearch=query;
  state.catalogFilter='semua';
  go('katalog');
});
document.addEventListener('input',(e)=>{
  if(e.target?.id==='ai-tool-search'&&state.route==='ai'){
    state.aiSearch=e.target.value;
    const start=e.target.selectionStart,end=e.target.selectionEnd;
    render();
    const next=document.getElementById('ai-tool-search');
    if(next){next.focus({preventScroll:true});
      if(start!==null&&end!==null)next.setSelectionRange(start,end);}
    return;
  }
  if(e.target?.id==='market-search'&&state.route==='katalog'){
    state.marketplaceSearch=e.target.value;
    const start=e.target.selectionStart,end=e.target.selectionEnd;
    render();
    const next=document.getElementById('market-search');
    if(next){next.focus({preventScroll:true});
      if(start!==null&&end!==null)next.setSelectionRange(start,end);}
    return;
  }
  if(!e.target||e.target.id!=='home-search')return;
  const q=e.target.value.trim().toLowerCase();let shown=0;
  document.querySelectorAll('.nh-home [data-search]').forEach(el=>{
    const hit=!q||el.getAttribute('data-search').includes(q);el.hidden=!hit;if(hit)shown++;
  });
  const none=by('nh-empty');if(none)none.hidden=shown>0;
});
document.addEventListener('change',e=>{
  if(e.target?.id!=='market-sort'||state.route!=='katalog')return;
  const selected=String(e.target.value||'default');
  if(!['default','name','price-asc','price-desc'].includes(selected))return;
  state.marketplaceSort=selected;render();
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
// Capture image loading failures even when the checkout is re-rendered.
document.addEventListener('error',event=>{
  const img=event.target;
  if(!(img instanceof HTMLImageElement)||!img.matches('[data-qris-image]'))return;
  img.hidden=true;
  const fallback=img.parentElement?.querySelector('[data-qris-fallback]');
  if(fallback)fallback.hidden=false;
  const confirmButton=img.closest('.checkout-dialog')?.querySelector('[data-action="confirm-payment"]');
  if(confirmButton){confirmButton.disabled=true;confirmButton.title='QRIS gagal dimuat. Hubungi Admin untuk meminta gambar resmi.';}
},true);

let affiliatePayoutSubmitting_=false;
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    const drawer=by('top-nav-drawer');
    if(drawer&&!drawer.hidden){
      drawer.hidden=true;
      by('top-nav-trigger')?.setAttribute('aria-expanded','false');
      by('top-nav-trigger')?.focus();
    }
  }
});
document.addEventListener('click',async(e)=>{
  const trigger=e.target.closest?.('#top-nav-trigger');
  if(trigger){
    const drawer=by('top-nav-drawer'),open=drawer?.hidden===true;
    if(drawer)drawer.hidden=!open;
    trigger.setAttribute('aria-expanded',String(open));
    if(open)drawer?.querySelector('button')?.focus();
    return;
  }
  if(e.target.closest?.('#top-nav-drawer [data-route]')){
    const drawer=by('top-nav-drawer');if(drawer)drawer.hidden=true;
    by('top-nav-trigger')?.setAttribute('aria-expanded','false');
  }else if(!e.target.closest?.('#top-nav-drawer')){
    const drawer=by('top-nav-drawer');if(drawer)drawer.hidden=true;
    by('top-nav-trigger')?.setAttribute('aria-expanded','false');
  }
  const affiliateAction=e.target.closest?.('[data-affiliate-refresh],[data-affiliate-payout]');
  if(affiliateAction){
    if(!logged()||isAdmin()||state.route!=='affiliate')return;
    if(affiliateAction.hasAttribute('data-affiliate-refresh')){
      affiliateAction.disabled=true;
      try{
        state.affiliates=await api('getAffiliateDashboard',{},state.token);
        render();
      }catch(error){
        affiliateAction.disabled=false;
        toast(error.message||'Gagal memuat komisi.',true);
      }
      return;
    }
    if(affiliatePayoutSubmitting_||!isWriteEnabled()||config.paymentsEnabled!==true)return;
    const rows=Array.isArray(state.affiliates?.komisi)?state.affiliates.komisi:[];
    const amount=rows.filter(x=>x.status==='APPROVED'&&!x.payout_requested_at)
      .reduce((sum,x)=>sum+(Number(x.nominal)||0),0);
    if(!(amount>0))return toast('Belum ada komisi untuk dicairkan.',true);
    const nomorDana=String(document.getElementById('commission-dana-number')?.value||'').replace(/[\s()-]/g,'');
    if(!/^08[0-9]{8,11}$/.test(nomorDana))
      return toast('Isi nomor DANA aktif dengan format 08xxxxxxxxxx.',true);
    if(!confirm('Ajukan komisi '+rupiah(amount)+' ke DANA nomor ...'+nomorDana.slice(-4)+'? Admin wajib memeriksa transfer sebelum menandai lunas.'))return;
    affiliatePayoutSubmitting_=true;
    affiliateAction.disabled=true;
    try{
      const result=await api('requestPayout',{nomor_dana:nomorDana},state.token,{write:true});
      state.affiliates=await api('getAffiliateDashboard',{},state.token);
      render();
      toast('Permintaan pencairan diterima'+(result?.total?' sebesar '+rupiah(result.total):'')+'. Menunggu pemeriksaan.');
    }catch(error){
      toast(error.message||'Pengajuan belum dapat diproses.',true);
      try{state.affiliates=await api('getAffiliateDashboard',{},state.token);render();}
      catch{affiliateAction.disabled=false;}
    }finally{
      affiliatePayoutSubmitting_=false;
    }
    return;
  }
  if(e.target.closest('[data-services-packages]')){
    document.getElementById('ngdb-packages')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    return;
  }
  if(e.target.closest('[data-service-request]')){
    if(!logged()){
      state.pendingServiceRequest=true;
      go('login');
    }else go('jasa');
    return;
  }
  if(e.target.closest('[data-market-browse]')){
    document.querySelector?.('#market-shopping')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    return;
  }
  if(e.target.closest('[data-market-refresh]')){
    if(!isConnected()||state.qa)return;
    const button=e.target.closest('[data-market-refresh]');
    button.disabled=true;
    const ok=await refreshMarketplaceData_();
    if(!ok){button.disabled=false;toast('Belum bisa memuat katalog terbaru.',true);}
    return;
  }
  if(e.target.closest('[data-market-reset]')){
    state.marketplaceSearch='';state.catalogFilter='semua';state.marketplaceSort='default';
    render();return;
  }
  const target=e.target.closest('[data-checkout-product],[data-checkout-create],[data-public-step],[data-partner-scroll],[data-partner-out],[data-ai-category],[data-ai-open],[data-ai-select],[data-hero-step],[data-hero-index],[data-hero-pause],[data-content-new],[data-content-create],[data-content-asset],[data-content-edit],[data-content-status],[data-service-id],[data-service-go],[data-catalog-edit],[data-catalog-image],[data-catalog-active],[data-route],[data-buy],[data-catalog-filter],[data-catalog-go],[data-action],[data-copy],[data-ticket-id],[data-member-id],[data-publish-release],[data-impact-action],[data-lms-action],[data-lms-filter],[data-lms-lesson-open],[data-lms-next],[data-payment-admin],[data-payment-open],[data-order-detail]');
  if(!target)return;
  if(target.hasAttribute('data-checkout-product')){
    openProductCheckout_(target.dataset.checkoutProduct);return;
  }
  if(target.hasAttribute('data-checkout-create')){
    await buy(target.dataset.checkoutCreate);return;
  }
  if(target.hasAttribute('data-order-detail')){
    await openOrderDetail_(target.dataset.orderDetail);
    return;
  }
  if(target.hasAttribute('data-payment-open')){
    if(!isAdmin())return;
    const id=String(target.dataset.paymentOpen||'');
    state.adminPaymentReviewId=state.adminPaymentReviewId===id?'':id;
    render();
    const form=document.getElementById('admin-payment-form');
    if(form){
      form.reset(); // Browser must not restore a previously checked funds-confirmation box.
      const verified=form.elements.namedItem('dana_diterima');
      if(verified)verified.checked=false;
      syncAdminPaymentApproval_();
      form.scrollIntoView?.({block:'nearest'});
    }
    return;
  }
  if(target.hasAttribute('data-payment-admin')){
    // Legacy quick-approve lacks the exact amount and verified settlement channel
    // demanded by the backend. Only the detailed review form may approve funds.
    if(target.dataset.paymentAdmin==='approve')return toast('Gunakan formulir Periksa dana & tindak lanjuti untuk persetujuan.',true);
    if(!isAdmin()||!paymentEnabled())return toast('Aksi pembayaran belum aktif.',true);
    const order=state.adminOrders.find(o=>o.order_id===target.dataset.orderId);
    if(!order||order.status!=='MENUNGGU_VERIFIKASI')return toast('Muat ulang antrean pembayaran.',true);
    const decision=target.dataset.paymentAdmin;
    const isApprove=decision==='approve';
    const reason=prompt(isApprove?'Masukkan referensi mutasi DANA/QRIS yang SUDAH DITERIMA (minimal 5 karakter):':'Alasan penolakan (minimal 5 karakter):');
    if(reason===null)return;
    if(reason.trim().length<5)return toast('Referensi/alasan minimal 5 karakter.',true);
    if(isApprove&&!confirm('Saya sudah mencocokkan penerimaan dana '+rupiah(order.total_bayar)+' di mutasi. Aktifkan produk dan kredit order '+order.order_id+'?'))return;
    try{
      await api('adminVerifyOrder',isApprove?{order_id:order.order_id,keputusan:'approve',dana_diterima:true,referensi_pembayaran:reason.trim()}:{order_id:order.order_id,keputusan:'reject',alasan:reason.trim()},state.token,{write:true});
      toast(isApprove?'Pembayaran disetujui.':'Pesanan ditolak.');await loadRoute('pesanan');render();
    }catch(error){toast(error.message,true);}
    return;
  }
  if(target.hasAttribute('data-partner-scroll')){
    document.getElementById('etalase-rekomendasi')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  if(target.hasAttribute('data-partner-out')){
    // Let browser open the verified external href unmodified. Tracking is
    // optional and may be gated off; it must never delay partner navigation.
    return;
  }
  if(target.hasAttribute('data-public-step')){
    const step=Number(target.dataset.publicStep);
    if(Number.isInteger(step)&&step>=0&&step<3){state.publicStep=step;render();}
  }
  else if(target.hasAttribute('data-ai-category')){
    const next=target.dataset.aiCategory;
    if(next!=='semua'&&!aiCategoryFor_(next))return;
    state.aiCategory=next;state.selectedAiToolId='';state.aiSearch='';
    render();
  }
  else if(target.hasAttribute('data-ai-open')){
    const tools=logged()&&!isAdmin()&&state.tools.length?state.tools:state.publicTools;
    const tool=tools.find(x=>x.tool_id===target.dataset.aiOpen);
    if(tool){state.selectedAiToolId=tool.tool_id;go('ai-tool');}
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
    state.contentEditId='';state.contentPresetProductId='catalog';state.contentRequestId=null;render();
  }else if(target.hasAttribute('data-content-create')){
    if(!isAdmin())return;
    const place=String(target.dataset.contentCreate||'');
    if(!['home','catalog','member_home'].includes(place))return;
    state.contentEditId='';state.contentPresetProductId=place;state.contentRequestId=null;render();
    document.getElementById('content-editor-form')?.scrollIntoView?.({block:'nearest'});
  }else if(target.hasAttribute('data-content-asset')){
    if(!isAdmin())return;
    const asset=String(target.dataset.contentAsset||'');
    const approved=new Set(['ngd-catalog-v9-wide.webp','ngd-v6-hero.webp',
      'ngd-v6-ebook.webp','ngd-v6-starter.webp','ngd-v6-bundle.webp',
      'ngd-v8-pos.webp','ngd-v8-video.webp','ngd-v8-gas.webp',
      'ngd-v8-ai-small.webp','ngd-v8-templates.webp']);
    if(!asset.startsWith('assets/media/')||!approved.has(asset.slice(13)))return;
    const field=document.getElementById('content-image');
    if(field){field.value=asset;updateContentPreview_();}
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
  else if(target.hasAttribute('data-catalog-image')){
    if(!isAdmin())return;
    const id=String(target.dataset.catalogImage||'');
    if(!adminCatalogItems().some(p=>p.product_id===id))return;
    state.contentPresetProductId=id;state.contentEditId='';
    state.contentRequestId=null;
    go('konten');
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
  else if(target.hasAttribute('data-route')){
    if(target.dataset.route==='konten'){
      state.contentPresetProductId='';state.contentEditId='';
    }
    go(target.dataset.route);
  }
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
  else if(target.dataset.action==='member-otp-request')await requestMemberLoginOtp_();
  else if(target.dataset.action==='otp-request'||target.dataset.action==='otp-verify')
    await handleRegistrationOtp_(target.dataset.action);
  else if(target.dataset.action==='logout')await logout();
  else if(target.dataset.action==='confirm-payment')await confirmPayment();
  else if(target.dataset.copy){
    try{await navigator.clipboard.writeText(target.dataset.copy);toast('Berhasil disalin.');}
    catch{toast('Gagal menyalin. Coba lagi.',true);}
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
document.addEventListener('input',(e)=>{
  if(e.target.closest?.('#admin-payment-form'))syncAdminPaymentApproval_();
});
document.addEventListener('change',(e)=>{
  if(e.target.closest?.('#admin-payment-form'))syncAdminPaymentApproval_();
});
document.addEventListener('submit',(e)=>{
  const id=e.target.id||(e.target.classList?.contains('ai-form')?'ai-run-form':'');
  if(!['admin-pin-form','content-editor-form','service-brief-form','service-quote-form','admin-catalog-form','profile-form','auth-form','support-create-form','ticket-reply-form',
    'ticket-status-form','ticket-priority-form','release-create-form','member-search-form','support-filter-form',
    'lms-course-form','lms-lesson-form','lms-ai-form','lms-ai-result-form','ai-run-form','admin-payment-form'].includes(id))return;
  e.preventDefault();
  if(id==='admin-pin-form')changeAdminPin_(e.target);
  if(id==='content-editor-form')submitContentForm_(e.target);
  if(id==='service-brief-form')submitServiceBrief(e.target);
  if(id==='service-quote-form')submitServiceQuote(e.target);
  if(id==='admin-catalog-form')submitCatalogForm(e.target);
  if(id==='profile-form')submitProfileForm(e.target);
  if(id==='auth-form')processLogin(e.target,e.target.dataset.mode==='register');
  if(id==='admin-payment-form')submitAdminPaymentForm_(e.target);
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
    tiket:'dukungan',checkout:state.checkoutReturnRoute||'katalog',
    'lms-editor':'lms','lms-lesson':'lms-editor','lms-ai':'lms-editor',
    'ai-tool':'ai',
    member360:'member'
  };
  go(back[state.route]||'beranda');
});
by('account-button').addEventListener('click',()=>go('akun'));
function syncBrowserRoute_(){
  // Back/Forward may emit both popstate and hashchange; render/load only once.
  if(location.hash===lastRouteHash_)return;
  lastRouteHash_=location.hash;
  const parsed=aiRouteFromHash_();
  const route=guestRoute_(parsed==='menu'?'beranda':parsed);
  if(route!==parsed){go(route);return;}
  state.route=route;render();loadRoute(route);
}
window.addEventListener('popstate',syncBrowserRoute_);
window.addEventListener('hashchange',syncBrowserRoute_);
// Called synchronously during initial script evaluation, before any awaited API.
function routeFreeDoor_(){
  const params=new URLSearchParams(location.search);
  const door=params.get('free');
  if(door!=='ebook'&&door!=='kelas')return false;
  const code=captureFirstInviter_();
  // A redirect is forbidden unless the browser has actually persisted and
  // read back the first valid inviter with its 30-day expiry.
  if(!code||firstInviter_()!==code)return false;
  const target=door==='ebook'?NGD_FREE_EBOOK_URL:NGD_FREE_CLASSROOM_URL;
  window.location.assign(target);
  return true;
}
async function init(){
  if(routeFreeDoor_())return;
  captureFirstInviter_();
  const requestedRoute=aiRouteFromHash_();
  state.route=guestRoute_(requestedRoute==='menu'?'beranda':requestedRoute);
  state.catalog=[];
  if(!activatePreview()){
    state.info=null;
    render();
    // Public catalog/content and a private session are independent. Do not
    // hold back the member/admin route behind slower public asset requests.
    const publicLoad=refreshPublic();
    await restoreSession();
    if(logged()&&guestPrivateRoutes_.has(requestedRoute)&&!isAdmin()){
      // Only resume a bookmarked private route after the server confirms the session.
      go(requestedRoute);
    }else if(logged())void loadRoute(state.route);
    await publicLoad;
  }else render();
}
init();

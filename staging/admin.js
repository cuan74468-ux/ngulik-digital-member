'use strict';
// Ngulik Digital STAGING workspace. Server permissions are authoritative.
// No token, PIN, or backend endpoint is persisted to local/session storage.
(() => {
  const $ = id => document.getElementById(id);
  const views = Object.freeze({
    dashboard: {title:'Ringkasan operasional',action:'adminGetDashboard',description:'Indikator yang tersimpan di database STAGING.'},
    members: {title:'Daftar anggota',action:'adminListMembers',description:'Akun anggota yang terdaftar di lingkungan STAGING.',fields:[['member_id','ID'],['nama','Nama anggota'],['wa','WhatsApp'],['nama_usaha','Usaha'],['status','Status'],['joined_at','Bergabung']]},
    catalog: {title:'Katalog produk',action:'adminListCatalog',description:'Produk sesuai data katalog STAGING, belum mengaktifkan checkout.',fields:[['product_id','ID'],['nama','Produk'],['tipe','Tipe'],['harga','Harga (Rp)'],['aktif','Aktif'],['urut','Urutan']]},
    orders: {title:'Daftar pesanan',action:'adminListOrders',description:'Pesanan yang benar-benar tersimpan di STAGING.',fields:[['order_id','ID pesanan'],['member_id','Anggota'],['nama_produk','Produk'],['total_bayar','Jumlah (Rp)'],['status','Status'],['created_at','Dibuat']]},
    waiting: {title:'Antrean pendaftaran',action:'adminListWaitingList',description:'Antrean terverifikasi, bukan data simulasi.',fields:[['member_id','ID'],['nama','Nama'],['wa','WhatsApp'],['nama_usaha','Usaha'],['posisi','Posisi']]},
    commissions: {title:'Komisi affiliate',action:'adminListCommissions',description:'Komisi hanya dibaca; payout tidak tersedia di workspace ini.',fields:[['komisi_id','ID komisi'],['referrer_id','Pengajak'],['order_id','Pesanan'],['nominal','Nominal (Rp)'],['status','Status'],['created_at','Dibuat']]},
    settings: {title:'Pengaturan sistem',action:'adminGetSettings',description:'Konfigurasi operasional dari backend, ditampilkan hanya sebagai informasi.'}
  });
  const visibleSettings = Object.freeze([
    ['nama_brand','Nama platform'],
    ['mode_pendaftaran','Mode pendaftaran'],
    ['kuota_gelombang','Kuota gelombang'],
    ['kredit_awal','Kredit awal'],
    ['trial_hari','Masa trial (hari)'],
    ['nilai_1_token_idr','Nilai token (Rp)'],
    ['topup_minimal_idr','Top-up minimal (Rp)'],
    ['otp_expiry_menit','Masa OTP (menit)'],
    ['otp_max_attempt','Percobaan OTP maksimum'],
    ['komisi_persen','Komisi (%)'],
    ['masa_tahan_hari','Masa tahan komisi (hari)'],
    ['ai_rate_limit_per_menit','Limit penggunaan AI']
  ]);
  const state = {
    endpoint:'', token:'', profile:null, identity:null,
    current:'dashboard', data:null, busy:false
  };
  const API_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec$/;
  // A self-reported STAGING identity is not proof of endpoint ownership.
  // Once GitHub has a verified deployment, PIN must never be sent to
  // another GAS /exec merely because it returns the same identity fields.
  const approvedEndpoint=String(globalThis.NGD_STAGING_CONFIG?.apiUrl||'').trim();
  const show = (id,visible) => {$(id).hidden = !visible;};
  const text = (id,value) => {$(id).textContent = String(value==null?'':value);};
  const node = (tag,className,content) => {
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(content!==undefined)n.textContent=String(content==null?'':content);
    return n;
  };
  const alertMessage = (message,success=false) => {
    const el=$('alert');
    el.textContent=String(message||'');
    el.className='alert'+(success?' success':'');
    el.hidden=!message;
  };
  const setBusy = value => {
    state.busy=Boolean(value);
    ['connect','login','refresh'].forEach(id=>{$(id).disabled=state.busy;});
  };
  function apiUrl(raw) {
    let url;
    try {url=new URL(String(raw||'').trim());}catch{throw new Error('URL Web App STAGING tidak valid.');}
    if(url.search||url.hash||url.username||url.password||!API_PATTERN.test(url.href))
      throw new Error('Gunakan URL resmi Google Apps Script yang berakhir dengan /exec, tanpa parameter.');
    if(approvedEndpoint && url.href!==approvedEndpoint)
      throw new Error('Alamat Web App tidak cocok dengan endpoint STAGING resmi yang telah diverifikasi.');
    return url.href;
  }
  function requestId() {
    if(!globalThis.crypto || typeof crypto.randomUUID!=='function')
      throw new Error('Browser membutuhkan dukungan pengacak identitas yang aman.');
    return crypto.randomUUID().replace(/-/g,'')+'aa';
  }
  async function request(action,payload={},token='',endpoint=state.endpoint) {
    if(!endpoint || !API_PATTERN.test(endpoint))throw new Error('Backend STAGING belum terverifikasi.');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),24000);
    try {
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({action,payload,token,request_id:requestId()}),
        mode:'cors',redirect:'follow',credentials:'omit',
        cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal
      });
      if(!response.ok)throw new Error('Server merespons HTTP '+response.status+'.');
      const json=await response.json();
      if(!json || typeof json.ok!=='boolean')
        throw new Error('Format respons API tidak sesuai.');
      if(!json.ok){
        const e=new Error(String(json.error?.message||'Permintaan ditolak oleh backend.'));
        e.code=String(json.error?.code||'API_ERROR');
        throw e;
      }
      return json.data;
    }catch(error){
      if(error.name==='AbortError')
        throw new Error('Server tidak merespons dalam 24 detik. Periksa deployment STAGING.');
      if(error instanceof TypeError)
        throw new Error('Koneksi browser ke Apps Script gagal. Periksa URL deployment, izin Web App, dan CORS.');
      throw error;
    }finally{clearTimeout(timeout);}
  }
  function onlyStaging(result) {
    return Boolean(result && typeof result==='object' &&
      result.workspace==='NGD_STAGING' && result.environment==='STAGING' &&
      result.admin_login_enabled===true &&
      typeof result.mutations_enabled==='boolean' &&
      result.registration_enabled===false &&
      result.otp_enabled===false &&
      result.finance_enabled===false);
  }
  function heading(title,description,place) {
    text('page-title',title);
    text('page-description',description);
    text('page-location',place);
  }
  function setNavEnabled(enabled) {
    show('menu',true);
    $('menu').classList.toggle('is-locked',!enabled);
    $('menu').querySelectorAll('button[data-view]').forEach(button=>{
      button.disabled=!enabled;
      button.setAttribute('aria-disabled',String(!enabled));
    });
    const caption=document.querySelector('.nav-locked');
    if(caption)caption.textContent=enabled?'AKSES AKTIF':'SESI DIPERLUKAN';
  }
  function clearAuth() {
    state.token='';
    state.profile=null;
    state.data=null;
    state.current='dashboard';
    show('workspace-section',false);
    setNavEnabled(false);
    show('exit',false);
    $('view-data').replaceChildren();
  }
  function showSetup(){
    clearAuth();
    state.endpoint='';
    state.identity=null;
    $('endpoint').value=approvedEndpoint;
    $('endpoint').readOnly=Boolean(approvedEndpoint);
    show('access-layout',true);
    show('setup-section',true);
    show('login-section',false);
    text('connection-status','Koneksi belum aktif');
    $('connection-status').classList.remove('ready');
    heading('Workspace administrator','Awasi anggota, produk, dan operasional Ngulik Digital melalui akses yang terverifikasi.','Akses administrator');
  }
  function showLogin(){
    clearAuth();
    show('access-layout',true);
    show('setup-section',false);
    show('login-section',true);
    text('connection-status','STAGING terverifikasi');
    $('connection-status').classList.add('ready');
    heading('Workspace administrator','Selamat datang. Masuk dengan akun resmi administrator untuk mengakses data operasional.','Masuk admin');
  }
  function badge(label,ok){
    return node('span','pill'+(ok?'':' locked'),label);
  }
  function drawEnvironment(){
    const info=$('env-info');
    const flags=[
      ['REGISTRASI',state.identity.registration_enabled],
      ['MUTASI',state.identity.mutations_enabled],
      ['OTP',state.identity.otp_enabled],
      ['KEUANGAN',state.identity.finance_enabled]
    ];
    info.replaceChildren();
    info.append(node('b','','NGD · STAGING'));
    flags.forEach(([name,enabled])=>info.append(badge(name+' '+(enabled?'ON':'OFF'),!enabled)));
  }
  function formatValue(value){
    if(value===true)return 'Ya';
    if(value===false)return 'Tidak';
    if(value===null||value===undefined||value==='')return '—';
    const s=String(value);
    return s.length>240?s.slice(0,237)+'…':s;
  }
  function dataTable(rows,fields) {
    const panel=node('section','data-panel');
    const header=node('div','data-panel-head');
    header.append(node('h2','','Data tercatat'));
    header.append(node('span','record-count',rows.length+' record'));
    panel.append(header);
    if(!rows.length){
      const empty=node('div','empty-state');
      empty.append(node('strong','','Belum ada data tercatat'));
      empty.append(node('p','','Tidak ada entri untuk bagian ini pada STAGING.'));
      panel.append(empty);
      return panel;
    }
    const wrap=node('div','table-wrap');
    const table=node('table','data-table');
    const thead=node('thead'),headRow=node('tr');
    fields.forEach(([,label])=>headRow.append(node('th','',label)));
    thead.append(headRow);
    const tbody=node('tbody');
    rows.slice(0,100).forEach(record=>{
      const row=node('tr');
      fields.forEach(([key])=>{
        const td=node('td','',formatValue(record?.[key]));
        row.append(td);
      });
      tbody.append(row);
    });
    table.append(thead,tbody);
    wrap.append(table);
    panel.append(wrap);
    return panel;
  }
  function drawMetrics(result){
    if(!result || !Array.isArray(result.ringkasan))
      throw new Error('Respons dashboard tidak sesuai kontrak backend.');
    const grid=node('div','metric-grid');
    result.ringkasan.forEach(item=>{
      const card=node('div','metric-card');
      card.append(node('span','metric-label',formatValue(item.metrik)));
      card.append(node('span','metric-value',formatValue(item.nilai)));
      grid.append(card);
    });
    if(!result.ringkasan.length){
      const info=node('p','view-description','Belum ada metrik ringkasan yang tercatat.');
      $('view-data').replaceChildren(info);
    }else $('view-data').replaceChildren(grid);
  }
  function drawSettings(result){
    if(!result || typeof result!=='object' || Array.isArray(result))
      throw new Error('Respons pengaturan tidak sesuai kontrak backend.');
    const rows=visibleSettings.filter(([key])=>Object.prototype.hasOwnProperty.call(result,key))
      .map(([key,label])=>({name:label,value:result[key]}));
    $('view-data').replaceChildren(dataTable(rows,[['name','Pengaturan'],['value','Nilai saat ini']]));
  }
  function drawTable(result,fields){
    if(!Array.isArray(result))throw new Error('Respons daftar dari backend tidak sesuai.');
    $('view-data').replaceChildren(dataTable(result,fields));
  }
  async function loadView(view){
    if(!state.token || !views[view] || state.busy)return;
    state.current=view;
    const selected=views[view];
    heading(selected.title,selected.description,'Administrator / '+selected.title);
    text('view-caption',selected.description);
    $('menu').querySelectorAll('[data-view]').forEach(button=>{
      const active=button.dataset.view===view;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    alertMessage('');
    $('view-data').replaceChildren(node('p','loader','Mengambil data langsung dari STAGING…'));
    setBusy(true);
    try{
      const result=await request(selected.action,{},state.token);
      if(view==='dashboard')drawMetrics(result);
      else if(view==='settings')drawSettings(result);
      else drawTable(result,selected.fields);
    }catch(error){
      $('view-data').replaceChildren();
      alertMessage(error.message);
      if(['UNAUTHORIZED','FORBIDDEN'].includes(error.code)){
        clearAuth();
        show('access-layout',true);
        show('setup-section',false);
        show('login-section',true);
        heading('Sesi administrator berakhir','Silakan masuk kembali menggunakan akun administrator STAGING.','Masuk admin');
      }
    }finally{setBusy(false);}
  }
  $('setup-form').addEventListener('submit',async e=>{
    e.preventDefault();
    if(state.busy)return;
    setBusy(true);
    alertMessage('');
    try{
      const url=apiUrl($('endpoint').value);
      const identity=await request('getStagingWorkspaceInfo',{},'',url);
      if(!onlyStaging(identity))throw new Error(
        'Backend tidak membuktikan identitas STAGING. Koneksi ditolak demi keamanan.'
      );
      state.endpoint=url;
      state.identity=identity;
      showLogin();
      alertMessage('Identitas STAGING terverifikasi. Anda dapat login menggunakan akun admin.',true);
      $('wa').focus();
    }catch(err){
      alertMessage(err.code==='MAINTENANCE'
        ? 'Web App STAGING merespons, tetapi versi deployment kemungkinan belum mendukung pemeriksaan identitas. Perbarui hanya deployment STAGING melalui Deploy → Manage deployments → Edit → New version → Deploy.'
        : err.message);
    }
    finally{setBusy(false);}
  });
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();
    if(state.busy)return;
    const form=e.target;
    const wa=form.elements.wa.value.trim();
    const pin=form.elements.pin.value;
    if(!/^(?:\+?62|0)\d{8,13}$/.test(wa.replace(/[\s()-]/g,'')) || !/^\d{6}$/.test(pin)){
      alertMessage('Gunakan nomor WhatsApp valid dan PIN enam angka.');
      return;
    }
    setBusy(true);alertMessage('');
    try{
      // Re-attest before sending administrator credentials.
      const check=await request('getStagingWorkspaceInfo');
      if(!onlyStaging(check))throw new Error('Identitas STAGING berubah. Login dibatalkan.');
      state.identity=check;
      const data=await request('adminLogin',{wa,pin});
      if(!data?.token || data?.profil?.role!=='ADMIN'){
        throw new Error('Server tidak mengembalikan sesi ADMIN yang sah.');
      }
      state.token=String(data.token);
      state.profile={role:'ADMIN',member_id:String(data.profil.member_id||'')};
      form.reset();
      show('login-section',false);
      show('access-layout',false);
      show('workspace-section',true);
      setNavEnabled(true);
      show('exit',true);
      drawEnvironment();
      text('connection-status','ADMIN · STAGING');
      // Release login busy state before the first authenticated read.
      setBusy(false);
      await loadView('dashboard');
    }catch(err){alertMessage(err.message);$('pin').value='';}
    finally{setBusy(false);}
  });
  $('change-endpoint').addEventListener('click',()=>{
    showSetup();
    alertMessage(approvedEndpoint
      ? 'Akses direset. Hubungkan ulang ke endpoint STAGING resmi.'
      : 'Sambungan terputus. Masukkan URL STAGING yang terverifikasi.',true);
  });
  $('exit').addEventListener('click',async ()=>{
    if(state.busy)return;
    const token=state.token;
    clearAuth();
    show('access-layout',true);
    show('setup-section',false);
    show('login-section',true);
    heading('Anda sudah keluar','Sesi browser ditutup. Gunakan akun administrator untuk kembali masuk.','Masuk admin');
    alertMessage('Sesi browser telah dibersihkan.',true);
    // Best effort server revocation; no credentials in URL or browser storage.
    try{await request('adminLogout',{},token);}catch{
      alertMessage('Sesi browser ditutup, tetapi revokasi di server belum terkonfirmasi. Tunggu sesi kedaluwarsa sebelum memakai perangkat bersama.');
    }
  });
  $('refresh').addEventListener('click',()=>loadView(state.current));
  $('menu').addEventListener('click',e=>{
    const button=e.target.closest('[data-view]');
    if(button&&views[button.dataset.view])loadView(button.dataset.view);
  });
  // An approved STAGING /exec URL may be published once in staging/config.js.
  // Without it, one-time manual URL entry is required; NEVER fall back to production.
  showSetup();
  if(approvedEndpoint){
    try{
      const url=apiUrl(approvedEndpoint);
      $('endpoint').value=url;
      $('setup-form').requestSubmit();
    }catch(error){
      alertMessage('Konfigurasi STAGING tidak valid. Gunakan URL deployment yang benar.');
    }
  }
})();

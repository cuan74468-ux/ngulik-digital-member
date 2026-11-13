(()=>{
  'use strict';
  const status=document.getElementById('status');
  const getButton=document.getElementById('test-get');
  const postButton=document.getElementById('test-post');
  const url=String(window.NGD_CONFIG?.apiUrl||'');
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url)){
    status.textContent='Belum dikonfigurasi. Jangan masukkan URL Web App yang belum diuji.';
    return;
  }
  getButton.disabled=false;postButton.disabled=false;
  status.textContent='Uji GET dan POST baca-saja tersedia; tidak ada kredensial yang dikirim.';
  async function perform(method){
    getButton.disabled=true;postButton.disabled=true;
    status.textContent='Menguji '+method+'…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const options={method,redirect:'follow',credentials:'omit',
        cache:'no-store',signal:controller.signal};
      if(method==='POST'){
        options.headers={'Content-Type':'text/plain;charset=utf-8'};
        options.body=JSON.stringify({
          action:'getPublicInfo',payload:{},token:'',request_id:''
        });
      }
      const response=await fetch(url,options);
      if(!response.ok)throw new Error('HTTP '+response.status);
      const result=await response.json();
      if(result?.ok!==true)throw new Error('Server menolak permintaan baca-saja');
      if(method==='GET'&&result.data?.app!=='Ngulik Digital API')
        throw new Error('Respons GET bukan API Ngulik Digital');
      if(method==='POST'&&typeof result.data?.nama_brand!=='string')
        throw new Error('Respons POST tidak berisi informasi publik');
      status.textContent=method+'_OK\n'+
        (method==='GET'?'Versi: '+String(result.data.version||'?')+
         '\nWrites enabled: '+String(result.data.writes_enabled===true):
         'Brand: '+String(result.data.nama_brand).slice(0,80))+
        '\nTidak ada transaksi atau kredensial yang dikirim.';
    }catch(err){
      status.textContent=method+'_FAILED\n'+String(err.message||err)+
        '\nCek CORS, redirect, akses deployment dan log Apps Script.'+
        '\nJangan gunakan no-cors atau JSONP untuk login.';
    }finally{clearTimeout(timer);getButton.disabled=false;postButton.disabled=false;}
  }
  getButton.addEventListener('click',()=>perform('GET'));
  postButton.addEventListener('click',()=>perform('POST'));
})();
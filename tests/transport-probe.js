(()=>{
  'use strict';
  const status=document.getElementById('status');
  const button=document.getElementById('test');
  const u=String(window.NGD_CONFIG?.apiUrl||'');
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(u)){
    status.textContent='Belum dikonfigurasi. Jangan memasukkan URL Web App yang belum diuji.';
    return;
  }
  button.disabled=false;
  status.textContent='Siap untuk uji GET. Tidak ada data pribadi yang dikirim.';
  button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Menghubungi endpoint GET…';
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(u,{method:'GET',redirect:'follow',
        credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      if(data?.ok!==true||data.data?.app!=='Ngulik Digital API')
        throw new Error('Respons bukan API Ngulik Digital');
      status.textContent='GET_OK\nVersi: '+String(data.data.version||'?')+
        '\nMutasi diaktifkan: '+String(data.data.writes_enabled===true)+
        '\nCatatan: POST/login belum diuji.';
    }catch(err){
      status.textContent='GET_FAILED\n'+String(err.message||err)+
        '\nJika browser menyebut CORS, jangan gunakan no-cors atau JSONP untuk login.';
    }finally{clearTimeout(timer);button.disabled=false;}
  });
})();

'use strict';
// Read-only external browser probe: public pages only, no credentials, no writes.
// Intended for CI diagnostics and to detect real white-screen regressions.
const {spawn}=require('node:child_process');
const {mkdtempSync,readFileSync,existsSync,rmSync}=require('node:fs');
const os=require('node:os'),path=require('node:path');
const {setTimeout:pause}=require('node:timers/promises');
const chrome=process.env.CHROME||'/usr/bin/google-chrome';
const profile=mkdtempSync(path.join(os.tmpdir(),'ngd-live-guest-'));
const proc=spawn(chrome,['--headless','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--no-first-run','--disable-background-networking',
  '--remote-allow-origins=*','--remote-debugging-port=0',
  '--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let ws,seq=0,errors=[],requests=[];
const pending=new Map();
function call(method,params={}){
  const id=++seq;return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},16000);
    pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},
      reject:e=>{clearTimeout(timer);reject(e);}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function start(){
  let tab;
  for(let i=0;i<130;i++){
    try{
      const p=path.join(profile,'DevToolsActivePort');
      if(!existsSync(p)){await pause(90);continue;}
      const port=parseInt(readFileSync(p,'utf8'),10);
      const r=await fetch('http://127.0.0.1:'+port+'/json');
      tab=(await r.json()).find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
      if(tab)break;
    }catch{}
    await pause(90);
  }
  if(!tab)throw Error('Headless Chrome failed');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});
    ws.addEventListener('error',no,{once:true});});
  ws.addEventListener('message',e=>{
    const m=JSON.parse(String(e.data));
    if(m.id&&pending.has(m.id)){const h=pending.get(m.id);pending.delete(m.id);
      m.error?h.reject(Error(JSON.stringify(m.error))):h.resolve(m.result);return;}
    if(m.method==='Runtime.exceptionThrown'){
      errors.push({type:'exception',description:String(m.params.exceptionDetails?.exception?.description||
        m.params.exceptionDetails?.text||'').slice(0,400)});
    }
    if(m.method==='Network.loadingFailed'&&!m.params.canceled){
      requests.push({type:'networkFailure',text:String(m.params.errorText||'').slice(0,130)});
    }
    if(m.method==='Log.entryAdded'&&m.params.entry?.level==='error'){
      errors.push({type:'logError',text:String(m.params.entry.text||'').slice(0,350)});
    }
  });
  await Promise.all([call('Page.enable'),call('Runtime.enable'),call('Network.enable'),call('Log.enable')]);
  await call('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,
    mobile:true,screenWidth:360,screenHeight:800});
}
async function visit(label,url){
  errors=[];requests=[];
  await call('Page.navigate',{url});
  await pause(14000);
  const out=await call('Runtime.evaluate',{returnByValue:true,
    expression:`(()=>{const e=document.querySelector('#screen'),nav=document.querySelector('#guest-nav'),
      login=document.querySelector('.guest-login'),main=document.querySelector('#main');
      const st=e?getComputedStyle(e):null;
      const r=e?.getBoundingClientRect();
      return {url:new URL(location.href).pathname,readyState:document.readyState,
        title:document.title,role:document.body?.dataset?.appRole||'',
        screenExists:!!e,screenHtmlLength:e?.innerHTML?.length||0,
        screenTextLength:e?.innerText?.length||0,screenTextSnippet:(e?.innerText||'').slice(0,145),
        screenRect:{width:Math.round(r?.width||0),height:Math.round(r?.height||0)},
        screenVisible:!!st&&st.display!=='none'&&st.visibility!=='hidden',
        mainVisible:main?getComputedStyle(main).display!=='none':false,
        guestNavExists:!!nav,guestNavVisible:nav?getComputedStyle(nav).display!=='none':false,
        loginExists:!!login,loginVisible:login?getComputedStyle(login).display!=='none':false,
        loginDisabled:!!login?.disabled,
        cfgPresent:!!window.NGD_CONFIG,apiConfigured:!!window.NGD_CONFIG?.apiUrl,
        cmsModule:!!window.NGD_PUBLIC_CMS,authModule:!!window.NGD_CMS_SURFACES,
        csp:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content?.slice(0,160),
        bodyWidth:document.body?.scrollWidth,windowWidth:innerWidth,
        scripts:[...document.querySelectorAll('script[src]')].map(s=>s.src.replace(/\\?.*$/,'').split('/').pop())
      };})()`});
  const data=out.result?.value;
  console.log('LIVE_GUEST_PROBE '+label+' '+JSON.stringify(data));
  console.log('LIVE_GUEST_ERRORS '+label+' '+JSON.stringify(errors.slice(0,12)));
  console.log('LIVE_GUEST_NETWORK '+label+' '+JSON.stringify(requests.slice(0,12)));
  if(!data?.screenExists||!data?.screenTextLength||!data?.screenVisible){
    throw Error(label+' blank screen: '+JSON.stringify(data).slice(0,500));
  }
}
(async()=>{
 try{
  await start();
  await visit('public-home','https://cuan74468-ux.github.io/ngulik-digital-member/');
  await visit('public-login','https://cuan74468-ux.github.io/ngulik-digital-member/#login');
  await visit('staging-home','https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html');
  await visit('staging-login','https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html#login');
 }catch(e){console.error('LIVE_GUEST_PROBE_FAILED:',String(e.stack||e));process.exitCode=1;}
 finally{try{ws?.close()}catch{}proc.kill();rmSync(profile,{recursive:true,force:true});}
})();

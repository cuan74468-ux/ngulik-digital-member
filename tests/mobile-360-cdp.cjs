'use strict';
// Real Chrome DevTools Protocol viewport override (not merely --window-size).
// Synthetic member fixture only. No production login, payment or database write.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync,existsSync}=require('node:fs');
const os=require('node:os'),path=require('node:path');
const {setTimeout:pause}=require('node:timers/promises');
const chrome=process.env.CHROME||'/usr/bin/google-chrome';
const profile=mkdtempSync(path.join(os.tmpdir(),'ngd-mobile-360-'));
let port=0;
const child=spawn(chrome,[
  '--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--disable-background-networking','--no-default-browser-check',
  '--remote-allow-origins=*','--remote-debugging-port=0',
  '--user-data-dir='+profile,'about:blank'
],{stdio:['ignore','ignore','pipe']});
let chromeErrors='';
child.stderr?.on('data',v=>{chromeErrors+=String(v).slice(0,800);if(chromeErrors.length>2800)chromeErrors=chromeErrors.slice(-2800);});
let ws,seq=0;
const pending=new Map();
function request(method,params={}){
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},15000);
    pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v);},reject});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function connect(){
  let target;
  for(let i=0;i<180;i++){
    try{
      const portFile=path.join(profile,'DevToolsActivePort');
      if(!existsSync(portFile)){await pause(100);continue;}
      const candidate=parseInt(String(readFileSync(portFile,'utf8')),10);
      if(!Number.isInteger(candidate)||candidate<1024){await pause(100);continue;}
      port=candidate;
      const r=await fetch('http://127.0.0.1:'+port+'/json');
      const tabs=await r.json();
      target=tabs.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
      if(target)break;
    }catch(e){}
    await pause(100);
  }
  assert.ok(target,'Chrome CDP did not become available; exit='+String(child.exitCode)+'; stderr='+chromeErrors);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  ws.addEventListener('message',evt=>{
    const m=JSON.parse(String(evt.data));
    if(!m.id||!pending.has(m.id))return;
    const p=pending.get(m.id);pending.delete(m.id);
    if(m.error)p.reject(Error(JSON.stringify(m.error)));
    else p.resolve(m.result);
  });
  await request('Page.enable');
  await request('Runtime.enable');
  await request('Emulation.setDeviceMetricsOverride',{
    width:360,height:800,deviceScaleFactor:1,mobile:true,screenWidth:360,screenHeight:800
  });
}
const jsCheck=`(()=>{
  const doc=document.documentElement,screen=document.querySelector('#screen');
  // Existing CI-only QA <output> nodes contain unbroken JSON, not app UI.
  // Hide only these probe diagnostics before measuring real application geometry.
  document.querySelectorAll('output[id^="qa-"]').forEach(el=>{el.style.display='none';});
  const h=document.querySelector('.ngd-member-hero h1')||
    document.querySelector('.ngd-member-services .service-heading h1');
  const colors=h?(()=>{
    const el=h,bg=h.closest('.ngd-member-hero,.service-heading');
    const c=getComputedStyle(el),b=bg&&getComputedStyle(bg);
    return {text:c.color,background:b?.backgroundColor||''};
  })():null;
  const critical=[...document.querySelectorAll('#screen h1,#screen h2,#screen .market-product-card,#screen .metric-card')].map(el=>{
    const r=el.getBoundingClientRect();
    return {tag:el.tagName,label:(el.textContent||'').slice(0,30),left:r.left,right:r.right};
  }).filter(x=>x.left< -1||x.right>innerWidth+1);
  const protruders=[...document.querySelectorAll('body *')].map(el=>{
    const r=el.getBoundingClientRect();
    return {element:el.tagName.toLowerCase(),id:el.id||'',className:String(el.className?.baseVal||el.className||'').slice(0,85),
      left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)};
  }).filter(x=>x.width>innerWidth+30||x.right>innerWidth+30||x.left< -30)
    .sort((x,y)=>y.right-x.right).slice(0,12);
  return {width:innerWidth,scrollWidth:doc.scrollWidth,bodyWidth:document.body.scrollWidth,protruders,
    bottomNav:!!document.querySelector('#mobile-nav'),
    bottomVisible:[...document.querySelectorAll('.mobile-nav')].some(el=>getComputedStyle(el).display!=='none'),
    drawerPresent:!!document.querySelector('#top-nav-drawer'),
    drawerHidden:document.querySelector('#top-nav-drawer')?.hidden,
    screen:!!screen,screenText:screen?.innerText?.slice(0,100)||'',
    colors,critical
  };
})()`;
async function visit(url,label){
  await request('Page.navigate',{url});
  await pause(1700);
  const r=await request('Runtime.evaluate',{expression:jsCheck,returnByValue:true,awaitPromise:true});
  assert.ok(!r.exceptionDetails,label+' JS exception');
  const x=r.result.value;
  console.log('MOBILE_360 '+label+' '+JSON.stringify(x));
  assert.equal(x.width,360,label+' actual CDP viewport');
  assert.ok(x.screen,label+' screen present');
  assert.ok(x.scrollWidth<=360,label+' horizontal overflow: '+x.scrollWidth);
  assert.ok(x.bodyWidth<=360,label+' body overflow: '+x.bodyWidth);
  assert.equal(x.bottomNav,false,label+' old bottom navigation in DOM');
  assert.equal(x.bottomVisible,false,label+' old bottom navigation visible');
  assert.equal(x.drawerPresent,true,label+' top drawer missing');
  assert.deepEqual(x.critical,[],label+' clipped cards/headings');
  if(['member-home','member-services','member-catalog'].includes(label)){
    mkdirSync('mobile-qa-artifacts',{recursive:true});
    const shot=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,
      fromSurface:true});
    writeFileSync('mobile-qa-artifacts/'+label+'-360x800.png',Buffer.from(shot.data,'base64'));
  }
  if(label==='member-home'){
    const click=await request('Runtime.evaluate',{expression:`(()=>{
      const toggle=document.getElementById('top-nav-trigger');
      toggle.click();
      const drawer=document.getElementById('top-nav-drawer');
      const opened=!drawer.hidden&&toggle.getAttribute('aria-expanded')==='true';
      const order=drawer.querySelector('[data-route="pesanan"]');
      const exists=Boolean(order);
      if(opened&&exists)order.click();
      return {opened,exists,closed:drawer.hidden,hash:location.hash};
    })()`,returnByValue:true});
    const m=click.result.value;
    console.log('MOBILE_360_DRAWER '+JSON.stringify(m));
    assert.ok(m.opened&&m.exists&&m.closed,label+' drawer toggles and closes on navigation');
    assert.equal(m.hash,'#pesanan',label+' drawer navigates to Pesanan');
  }
  if(label==='member-home'||label==='member-services'){
    assert.ok(x.colors,label+' hero text missing');
    // WCAG 2.x normal-text contrast, using actual computed CSS colors.
    const rgb=value=>(String(value).match(/[0-9]+/g)||[]).slice(0,3).map(Number);
    const luminance=arr=>arr.slice(0,3).map(v=>{
      const x=v/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
    }).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const ink=rgb(x.colors.text),surface=rgb(x.colors.background);
    assert.equal(ink.length,3,label+' text CSS rgb');
    assert.equal(surface.length,3,label+' surface CSS rgb');
    const a=luminance(ink),b=luminance(surface);
    const contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    console.log('MOBILE_360_CONTRAST '+label+' '+contrast.toFixed(2));
    assert.ok(contrast>=4.5,label+' fails 4.5:1 contrast ('+contrast.toFixed(2)+')');
  }
}
(async()=>{
  try{
    await connect();
    const host='http://127.0.0.1:8765/';
    for(const [label,part] of [
      ['guest-home',''],['guest-catalog','#katalog'],['guest-services','#jasa'],
      ['member-home','?preview=member#beranda'],
      ['member-catalog','?preview=member#katalog'],
      ['member-services','?preview=member#jasa'],
      ['member-ai','?preview=member#ai'],
      ['member-affiliate','?preview=member#affiliate'],
      ['member-orders','?preview=member#pesanan']
    ])await visit(host+part,label);
    console.log('MOBILE_360_ALL_ROUTES_OK');
  }finally{
    try{ws?.close();}catch(e){}
    child.kill('SIGTERM');
    rmSync(profile,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

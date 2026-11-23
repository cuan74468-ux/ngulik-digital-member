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
  const h=document.querySelector('.ngdm-wallet-top > span:first-child')||
    document.querySelector('.ngd-member-services .service-heading h1')||
    document.querySelector('.ngdb-hero h1');
  const colors=h?(()=>{
    const el=h,bg=h.closest('.ngdm-wallet,.ngd-member-hero,.service-heading,.ngdb-hero');
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
  if(label==='guest-home'||label==='member-home'){
    const windowFrame=await request('Runtime.evaluate',{expression:`(()=>{
      const selector=document.body.dataset.appRole==='member'?
        '#screen .ngdm-orders.ngd-window-frame':'#screen .ngdl-story.ngd-window-frame';
      const panel=document.querySelector(selector);
      const header=panel?.querySelector(':scope > .ngd-window-titlebar');
      const dots=header?.querySelectorAll('.ngd-window-dots > i')||[];
      const panelRect=panel?.getBoundingClientRect(),headerRect=header?.getBoundingClientRect();
      const color=e=>e?getComputedStyle(e).backgroundColor:'';
      return {panel:!!panel,header:!!header,dots:dots.length,
        color:color(header),pink:color(dots[1]),yellow:color(dots[2]),
        horizontalFit:!!panelRect&&!!headerRect&&headerRect.left>=panelRect.left-1&&headerRect.right<=panelRect.right+1,
        contentVisible:!!panel?.querySelector('h2')&&panel.querySelector('h2').getBoundingClientRect().height>0};
    })()`,returnByValue:true});
    const fr=windowFrame.result.value;console.log('NGD_V5_SEMANTIC_FRAME '+label+' '+JSON.stringify(fr));
    assert.ok(fr.panel&&fr.header&&fr.contentVisible,label+' frame content missing');
    assert.equal(fr.dots,3);
    assert.equal(fr.color,'rgb(234, 229, 255)');
    assert.equal(fr.pink,'rgb(246, 118, 183)');
    assert.equal(fr.yellow,'rgb(255, 217, 101)');
    assert.equal(fr.horizontalFit,true,label+' frame titlebar clips or overflows');
  }
  if(label==='guest-home'||label==='member-home'){
    const brand=await request('Runtime.evaluate',{expression:`(()=>{
      const head=document.querySelector('.topbar'),mark=head?.querySelector('.guest-brand-icon');
      const title=head?.querySelector('.guest-brand strong');
      const image=mark?.querySelector('img');
      return {bg:head?getComputedStyle(head).backgroundColor:'',
        title:title?getComputedStyle(title).color:'',
        iconBg:mark?getComputedStyle(mark).backgroundColor:'',
        logoVisible:!!image&&getComputedStyle(image).display!=='none',
        headerWidth:Math.round(head?.getBoundingClientRect().width||0)};
    })()`,returnByValue:true});
    const h=brand.result.value;console.log('NGD_V3_HEADER '+label+' '+JSON.stringify(h));
    assert.equal(h.bg,'rgb(20, 20, 24)','header should use ink background');
    assert.equal(h.title,'rgb(255, 255, 255)','brand title must be white on ink');
    assert.equal(h.iconBg,'rgb(204, 243, 73)','brand icon should be framed in lime');
    assert.equal(h.logoVisible,true,'original brand image must remain visible');
    assert.ok(h.headerWidth<=360,'mobile header overflow');
  }
  if(label==='guest-home'||label==='member-home'){
    const themed=await request('Runtime.evaluate',{expression:`(()=>{
      const guest=document.querySelector('#screen .ngdl-hero');
      const wallet=document.querySelector('#screen .ngdm-wallet');
      const chart=document.querySelector('#screen .ngdm-wallet-chart');
      const metric=document.querySelector('#screen .ngdm-metric:first-child');
      const bg=el=>el?getComputedStyle(el).backgroundColor:'';
      const shadow=el=>el?getComputedStyle(el).boxShadow:'';
      return {hero:bg(guest),wallet:bg(wallet),chart:bg(chart),metric:bg(metric),
        heroShadow:shadow(guest),walletShadow:shadow(wallet)};
    })()`,returnByValue:true});
    const v=themed.result.value;console.log('NGD_V2_THEME '+label+' '+JSON.stringify(v));
    if(label==='guest-home'){
      assert.equal(v.hero,'rgb(91, 61, 245)','Guest hero not electric purple');
      assert.ok(v.heroShadow!=='none','Guest hero hard shadow missing');
    }else{
      assert.equal(v.wallet,'rgb(91, 61, 245)','Member wallet still pale');
      assert.equal(v.chart,'rgb(204, 243, 73)','Member chart not acid lime');
      assert.equal(v.metric,'rgb(204, 243, 73)','First metric not lime');
      assert.ok(v.walletShadow!=='none','Member wallet hard shadow missing');
    }
  }
  if(label==='member-studio'){
    const r=await request('Runtime.evaluate',{expression:`(()=>{
      const root=document.getElementById('ngd-studio-root');
      const c=root?.querySelector('#ns-canvas');
      const tabs=[...root?.querySelectorAll('.ns-tabs')||[]];
      const before=window.NGD_STUDIO?.debugSnapshot();
      const width=root?.getBoundingClientRect().width||0;
      const documentWidth=document.documentElement.scrollWidth;
      const imageCards=root?.querySelectorAll('[data-template]').length||0;
      const card=root?.querySelector('[data-template="kuliner-hangat"]');
      card?.click();
      const editor=root?.querySelector('.ns-editor');
      const visibleCanvas=root?.querySelector('#ns-canvas');
      const ratio=visibleCanvas?visibleCanvas.width+'x'+visibleCanvas.height:'';
      return {root:!!root,initialCanvas:!!c,tabs:tabs.length,imageCards,editor:!!editor,ratio,width,documentWidth,adapter:before?.mode};
    })()`,returnByValue:true});
    const v=r.result.value;
    console.log('MOBILE_360_STUDIO '+JSON.stringify(v));
    assert.ok(v.root&&v.imageCards===6&&v.editor,'P1 Studio gallery/editor missing');
    assert.equal(v.adapter,'SIMULATION','P1 cannot use live credit adapter');
    assert.equal(v.ratio,'1080x1350','P1 Canvas resolution mismatch');
    assert.ok(v.documentWidth<=360,'P1 Studio overflow');
    mkdirSync('mobile-qa-artifacts',{recursive:true});
    const shot=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    writeFileSync('mobile-qa-artifacts/member-studio-360x800.png',Buffer.from(shot.data,'base64'));
  }
  if(label==='member-home'){
    const click=await request('Runtime.evaluate',{expression:`(()=>{
      const toggle=document.getElementById('top-nav-trigger');
      toggle.click();
      const drawer=document.getElementById('top-nav-drawer');
      const opened=!drawer.hidden&&toggle.getAttribute('aria-expanded')==='true';
      const order=drawer.querySelector('[data-route="belajar"]');
      const exists=Boolean(order);
      if(opened&&exists)order.click();
      return {opened,exists,closed:drawer.hidden,hash:location.hash};
    })()`,returnByValue:true});
    const m=click.result.value;
    console.log('MOBILE_360_DRAWER '+JSON.stringify(m));
    assert.ok(m.opened&&m.exists&&m.closed,label+' drawer toggles and closes on navigation');
    assert.equal(m.hash,'#belajar',label+' More drawer navigates to Belajar without duplicating Pesanan tab');
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
      ['member-studio','?preview=member#ai-tool/ngulik-visual'],
      ['member-learning','?preview=member#belajar'],
      ['member-support','?preview=member#dukungan'],
      ['member-account','?preview=member#akun'],
      ['member-referral','?preview=member#affiliate'],
      ['member-order-list','?preview=member#pesanan'],
      ['admin-home','?preview=admin#admin'],
      ['admin-catalog','?preview=admin#produk'],
      ['admin-members','?preview=admin#member'],
      ['admin-lms','?preview=admin#lms'],
      ['member-affiliate','?preview=member#affiliate'],
      ['member-orders','?preview=member#pesanan']
    ])await visit(host+part,label);
    console.log('MOBILE_360_ALL_ROUTES_OK');
    // Also verify the real signed-in PC header; mobile-only QA previously missed it.
    await request('Emulation.setDeviceMetricsOverride',{
      width:1366,height:800,deviceScaleFactor:1,mobile:false,
      screenWidth:1366,screenHeight:800
    });
    await request('Page.navigate',{url:host+'?preview=member#beranda'});
    await pause(1800);
    const pc=await request('Runtime.evaluate',{
      expression:"(()=>{const nav=document.getElementById('guest-nav');const more=document.getElementById('top-nav-trigger');const visible=x=>!!x&&getComputedStyle(x).display!=='none';return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,routes:[...nav.querySelectorAll('[data-route]')].filter(visible).map(x=>x.dataset.route),nav:visible(nav),more:visible(more),burger:visible(more.querySelector('svg')),label:visible(more.querySelector('.ngdm-desktop-more-text')),order:visible(document.getElementById('header-order')),badge:visible(document.getElementById('mode-indicator')),dashboard:visible(document.querySelector('.ngdm-dashboard'))};})()",
      returnByValue:true
    });
    assert.ok(!pc.exceptionDetails,'desktop Chrome runtime error');
    const desktop=pc.result.value;
    console.log('MEMBER_DESKTOP_1366 '+JSON.stringify(desktop));
    const pcTheme=await request('Runtime.evaluate',{
      expression:`(()=>{
        const wallet=document.querySelector('#screen .ngdm-wallet');
        const chart=document.querySelector('#screen .ngdm-wallet-chart');
        const summary=document.querySelector('#screen .ngdm-metric:last-child');
        return {wallet:wallet?getComputedStyle(wallet).backgroundColor:'',
          chart:chart?getComputedStyle(chart).backgroundColor:'',
          lastMetric:summary?getComputedStyle(summary).backgroundColor:'',
          walletWidth:wallet?Math.round(wallet.getBoundingClientRect().width):0,
          documentWidth:document.documentElement.scrollWidth};
      })()`,returnByValue:true
    });
    const pcColors=pcTheme.result.value;
    console.log('NGD_V2_DESKTOP_THEME '+JSON.stringify(pcColors));
    assert.equal(pcColors.wallet,'rgb(91, 61, 245)','PC wallet must use Studio purple');
    assert.equal(pcColors.chart,'rgb(204, 243, 73)','PC wallet chart must use Studio lime');
    assert.equal(pcColors.lastMetric,'rgb(20, 20, 24)','PC third metric must be ink');
    assert.ok(pcColors.walletWidth>=600,'PC wallet should fill the main content');
    assert.ok(pcColors.documentWidth<=1366,'PC layout overflow');
    const shellChrome=await request('Runtime.evaluate',{expression:`(()=>{
      const head=document.querySelector('.topbar');
      const nav=head?.querySelector('#guest-nav');
      const current=nav?.querySelector('button[aria-current="page"]');
      const title=head?.querySelector('.guest-brand strong');
      return {head:getComputedStyle(head).backgroundColor,
        nav:getComputedStyle(nav).backgroundColor,
        active:current?getComputedStyle(current).backgroundColor:'',
        title:getComputedStyle(title).color,
        navWidth:Math.round(nav?.getBoundingClientRect().width||0)};
    })()`,returnByValue:true});
    const brandChrome=shellChrome.result.value;
    console.log('NGD_V3_DESKTOP_NAV '+JSON.stringify(brandChrome));
    assert.equal(brandChrome.head,'rgb(20, 20, 24)');
    assert.equal(brandChrome.nav,'rgb(20, 20, 24)');
    assert.equal(brandChrome.active,'rgb(204, 243, 73)');
    assert.equal(brandChrome.title,'rgb(255, 255, 255)');
    assert.ok(brandChrome.navWidth>200);
    assert.equal(desktop.width,1366);
    assert.ok(desktop.scrollWidth<=1366,'desktop horizontal overflow '+desktop.scrollWidth);
    assert.deepEqual(desktop.routes,['beranda','katalog','ai','jasa','belajar']);
    assert.equal(desktop.nav,true);
    assert.equal(desktop.more,true);
    assert.equal(desktop.burger,false,'mobile hamburger visible on desktop');
    assert.equal(desktop.label,true,'desktop Lainnya text not visible');
    assert.equal(desktop.order,false,'duplicated order header');
    assert.equal(desktop.badge,false,'redundant role badge');
    assert.equal(desktop.dashboard,true);
    const dropdown=await request('Runtime.evaluate',{
      expression:"(()=>{document.getElementById('top-nav-trigger').click();const pane=document.getElementById('top-nav-drawer');const routes=[...pane.querySelectorAll('nav [data-route]')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.dataset.route);return {open:!pane.hidden,routes};})()",
      returnByValue:true
    });
    assert.deepEqual(dropdown.result.value,{open:true,routes:['pesanan','affiliate','dukungan','akun']});
    console.log('MEMBER_DESKTOP_NAV_OK');
  }finally{
    try{ws?.close();}catch(e){}
    child.kill('SIGTERM');
    rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:120});
  }
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

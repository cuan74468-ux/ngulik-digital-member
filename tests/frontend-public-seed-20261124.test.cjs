'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const w={};vm.runInNewContext(read('js/public-seed.js'),{window:w});
const seed=JSON.parse(JSON.stringify(w.NGD_PUBLIC_SEED));
const app=read('js/app.js'),home=read('js/public-cms-home.js');
const allow={siteContent:'content_id kind placement title description image_path cta_label cta_route sort_order start_date end_date',catalog:'product_id nama deskripsi tipe harga kredit_diberikan durasi_hari bisa_komisi komisi_persen komisi_nominal_tetap',publicTools:'tool_id nama deskripsi kredit_biaya',publicInfo:'nama_brand wa_admin kuota mode disclosure',publicSettings:'nama_brand tagline_brand footer_identitas footer_aksesibilitas'};
test('public seed exact field allowlists, valid dated hero, separate environments and bounded bytes',()=>{
 assert.ok(Buffer.byteLength(read('js/public-seed.js'))<150000);
 assert.equal(seed.v,1);assert.deepEqual(Object.keys(seed.envs).sort(),['prd','stg']);
 assert.notEqual(w.NGD_PUBLIC_SEED.envs.prd,w.NGD_PUBLIC_SEED.envs.stg);
 for(const data of Object.values(seed.envs)){
  for(const [group,fields] of Object.entries(allow)){
   for(const item of Array.isArray(data[group])?data[group]:[data[group]])
    for(const key of Object.keys(item))assert.ok(fields.split(' ').includes(key),group+':'+key);
  }
  assert.ok(data.siteContent.some(r=>r.content_id==='CNT-HERO-MAIN'&&r.kind==='HERO'&&r.placement==='home'&&r.image_path));
  assert.ok(data.siteContent.every(r=>(!r.start_date||r.start_date<='2026-11-24')&&(!r.end_date||r.end_date>='2026-11-24')));
  assert.ok(data.catalog.every(r=>r.product_id!=='P-B36AA0054926'&&!/^P-QA-/.test(r.product_id)));
  assert.ok(!data.siteContent.some(r=>r.content_id==='CNT-HONESTY-BOX'));
  assert.ok(!data.catalog.some(r=>['P-INTEGRASI-GAS','P-INTEGRASI-SUPA'].includes(r.product_id)));
 }
});
test('seed installed before app at both real entry points with high priority hero',()=>{
 for(const file of ['index.html','staging/member.html']){
  const h=read(file);assert.ok(h.indexOf('js/public-seed.js?v=20261124-seed2')<h.indexOf('js/app.js?v='));
  assert.match(h,/rel="preload" as="image"[^>]+fetchpriority="high"/);
 }
 assert.match(home,/loading="eager" fetchpriority="high" width="1200" height="800"/);
 assert.ok(app.indexOf('if(!applyPublicSnap_())applyPublicSeed_();')<app.lastIndexOf('const publicLoad=refreshPublic();'));
});
test('seed selects environment, filters expired content, and never seeds account or effective registration state',()=>{
 const src=app.slice(app.indexOf('function publicSnapHasHero_'),app.indexOf('const publicRetryDelayMs_'));
 const data=JSON.parse(JSON.stringify(seed));data.envs.stg.siteContent.find(r=>r.content_id==='CNT-HERO-MAIN').title='STG fixture';
 const now=new Date('2026-11-24T14:00:00Z').getTime();
 class Clock extends Date{static now(){return now;}}
 const make=(pathname)=>{const state={qa:false};const fn=new Function('state','window','location','isConnected','Date',src+';return {applyPublicSeed_,publicActiveRows_};');return {state,fn:fn(state,{NGD_PUBLIC_SEED:data},{pathname},()=>true,Clock)}};
 const stg=make('/staging/member.html'),prd=make('/');assert.ok(stg.fn.applyPublicSeed_());assert.ok(prd.fn.applyPublicSeed_());
 assert.notEqual(stg.state.siteContent[0].title,prd.state.siteContent[0].title);assert.equal(stg.state.cmsLoaded,true);
 assert.equal(stg.state.info.mode,undefined);assert.equal(stg.state.info.terpakai,undefined);assert.equal(stg.state.token,undefined);
 assert.deepEqual(stg.fn.publicActiveRows_([{end_date:'2026-11-23'},{start_date:'2026-11-25'},{start_date:'invalid'},{status:'DRAFT'}]),[]);
});
test('browser performance smoke runs in CI with intercepted external traffic', {timeout:150000,skip:!process.env.CI&&!process.env.CHROME},async()=>{
 const {spawn}=require('node:child_process'),{setTimeout:pause}=require('node:timers/promises'),os=require('node:os'),http=require('node:http');
 const chrome=process.env.CHROME||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
 assert.ok(chrome,'Chrome required for CI');
 const base=path.resolve(__dirname,'..');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let p=path.resolve(base,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!p.startsWith(base+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(err,b)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(b);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const mockImage='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#aabbaa"/></svg>';
 // Retry browser startup only, never a page assertion or the hero timing.
 const stopChrome=async(child,profile)=>{
  if(child.exitCode===null&&child.signalCode===null)child.kill();
  for(let i=0;i<40&&child.exitCode===null&&child.signalCode===null;i++)await pause(50);
  if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await pause(200);}
  try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch(_){}
 };
 const launchChrome=async()=>{
  let failure='';
  for(let attempt=1;attempt<=2;attempt++){
   const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ngd-seed-'));
   const child=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
   let stderr='',spawnError=null;
   child.stderr.on('data',b=>{stderr=(stderr+String(b)).slice(-3000);});
   child.on('error',e=>{spawnError=e;});
   const portFile=path.join(profile,'DevToolsActivePort'),deadline=Date.now()+20000;
   while(Date.now()<deadline&&!spawnError&&child.exitCode===null&&child.signalCode===null){
    if(fs.existsSync(portFile)){
     try{
      const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
      if(port>0){
       const targets=await (await fetch('http://127.0.0.1:'+port+'/json',{signal:AbortSignal.timeout(1500)})).json();
       const target=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
       if(target)return {child,profile,target};
      }
     }catch(_){}
    }
    await pause(100);
   }
   failure='Chrome startup attempt '+attempt+': '+(spawnError?.message||'DevTools endpoint unavailable')+'; exit='+child.exitCode+'; '+stderr;
   await stopChrome(child,profile);
  }
  throw Error(failure);
 };
 const run=async(entry,mode,width=360,height=800)=>{
  const {child,profile,target}=await launchChrome();
  let ws,seq=0,closed=false;const pending=new Map(),timers=new Set();
  const request=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},12000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id,method,params}));});
  const env=entry.includes('staging')?'stg':'prd',d=seed.envs[env],hero=d.siteContent.find(r=>r.content_id==='CNT-HERO-MAIN');
  try{
   ws=new WebSocket(target.webSocketDebuggerUrl);
   await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
   ws.addEventListener('message',evt=>{
    const m=JSON.parse(String(evt.data));
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);return;}
    if(m.method!=='Fetch.requestPaused')return;
    const {requestId,request:req}=m.params;
    const fulfill=(body,mimeType)=>request('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:mimeType},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
    const respond=async()=>{
     if(closed)return;
     if(req.url.startsWith(origin))return request('Fetch.continueRequest',{requestId});
     if(req.url.includes('images.unsplash.com'))return fulfill(mockImage,'image/svg+xml');
     if(req.url.includes('script.google')){
      if(mode==='abort')return request('Fetch.failRequest',{requestId,errorReason:'Aborted'});
      let action;try{action=JSON.parse(req.postData||'{}').action;}catch(_){}
      const content=mode==='update'?d.siteContent.map(r=>r.content_id==='CNT-HERO-MAIN'?{...r,title:'CI UPDATED HERO'}:r):d.siteContent;
      const payload={getPublicContent:content,getPublicSettings:d.publicSettings,getPublicInfo:d.publicInfo,getKatalog:d.catalog,getPublicTools:d.publicTools};
      return fulfill(JSON.stringify(Object.hasOwn(payload,action)?{ok:true,data:payload[action]}:{ok:false,error:{code:'UNAVAILABLE',message:'CI mock'}}),'application/json');
     }
     return request('Fetch.failRequest',{requestId,errorReason:'Aborted'});
    };
    if(req.url.includes('script.google')&&mode==='delay'){const timer=setTimeout(()=>{timers.delete(timer);respond().catch(()=>{});},10000);timers.add(timer);}else respond().catch(()=>{});
   });
   await request('Page.enable');await request('Runtime.enable');
   await request('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=760,screenWidth:width,screenHeight:height});
   await request('Network.enable');await request('Network.setCacheDisabled',{cacheDisabled:true});
   await request('Fetch.enable',{patterns:[{urlPattern:'http*://*'}]});
   await request('Page.addScriptToEvaluateOnNewDocument',{source:`window.__seedHeroMs=null;window.__seedLcp=null;new PerformanceObserver(l=>{const e=l.getEntries().at(-1);if(e)window.__seedLcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new MutationObserver(()=>{if(window.__seedHeroMs===null&&document.querySelector('#ngdl-title'))window.__seedHeroMs=performance.now()}).observe(document,{subtree:true,childList:true});`});
   await request('Page.navigate',{url:origin+entry});
   const evaluate=async expression=>{const out=await request('Runtime.evaluate',{expression,returnByValue:true});assert.ok(!out.exceptionDetails,JSON.stringify(out.exceptionDetails));return out.result.value;};
   let v;for(let i=0;i<100;i++){v=await evaluate(`(()=>({ms:window.__seedHeroMs,title:document.querySelector('#ngdl-title')?.textContent,image:!!document.querySelector('.ngd-cms-hero-art')?.naturalWidth,bad:!!document.querySelector('.ngd-cms-unavailable')||document.querySelector('#screen')?.innerText.includes('Sedang memuat informasi'),fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcp:window.__seedLcp}))()`);if(v?.title&&v.image)break;await pause(50);}
   assert.ok(v?.title,entry+' '+mode+' missing hero');assert.ok(v.image,'mock image not loaded');assert.ok(!v.bad,'loading state present');assert.ok(v.ms<1500,'hero exceeds 1500 ms: '+JSON.stringify(v));
   const geometry=await evaluate(`(()=>{const h=document.querySelector('.ngdl-hero'),i=h.querySelector('.ngd-cms-hero-art'),copy=h.querySelector('.ngdl-hero-copy'),a=h.getBoundingClientRect(),b=i.getBoundingClientRect(),c=copy.getBoundingClientRect();return {fills:b.width>=a.width-5&&b.height>=a.height-5,cover:getComputedStyle(i).objectFit,copyOnTop:Number(getComputedStyle(copy).zIndex)>Number(getComputedStyle(i).zIndex),copyFits:c.left>=a.left&&c.right<=a.right+1&&c.top>=a.top&&c.bottom<=a.bottom+1,position:getComputedStyle(i).position,overlay:getComputedStyle(h,'::after').backgroundImage,heading:getComputedStyle(copy.querySelector('h1')).color,background:getComputedStyle(h).backgroundColor,height:a.height,overflow:document.documentElement.scrollWidth}})()`);
   assert.equal(geometry.cover,'cover');assert.ok(geometry.fills,'hero image does not fill banner');assert.ok(geometry.copyOnTop&&geometry.copyFits,'hero copy layering/fit');assert.ok(geometry.overflow<=width,'seeded home overflow');
   assert.equal(geometry.position,'absolute');assert.match(geometry.overlay,/linear-gradient/);assert.equal(geometry.heading,'rgb(255, 255, 255)');assert.equal(geometry.background,'rgb(17, 24, 39)');if(width>760)assert.ok(geometry.height<=520,'desktop hero too tall');
   console.log('NGD_HERO_GEOMETRY '+JSON.stringify({entry,width,...geometry}));
   if(mode==='normal'){const shot=await request('Page.captureScreenshot',{format:'png'});const dir=path.join(base,'mobile-qa-artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'cms-hero-'+env+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
   if(mode==='update'){for(let i=0;i<100&&v.title!=='CI UPDATED HERO';i++){await pause(50);v.title=await evaluate("document.querySelector('#ngdl-title')?.textContent");}assert.equal(v.title,'CI UPDATED HERO');}
   console.log('NGD_SEED_SIMULATION '+JSON.stringify({entry,mode,...v}));
   assert.ok(await evaluate("!!document.querySelector('[data-route=katalog]')"),'catalog navigation missing');
   assert.ok(await evaluate("!!document.querySelector('[data-route=dukungan]')"),'support navigation missing');
  }finally{closed=true;for(const t of timers)clearTimeout(t);ws?.close();await stopChrome(child,profile);}
 };
 try{for(const entry of ['/','/staging/member.html']){for(const mode of ['normal','delay','abort','update'])await run(entry,mode);await run(entry,'normal',1366,768);}}finally{await new Promise(resolve=>server.close(resolve));}
});

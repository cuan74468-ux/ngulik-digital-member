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
  if(label!=='member-studio'){
    mkdirSync('mobile-qa-artifacts',{recursive:true});
    const shot=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,
      fromSurface:true});
    writeFileSync('mobile-qa-artifacts/'+label+'-360x800.png',Buffer.from(shot.data,'base64'));
  }
  // A newly provisioned CMS with no published rows must show a neutral loader,
  // not invent a marketing campaign. Test its mobile fit above; legacy window
  // chrome checks continue for authenticated member panels below.
  if(label==='member-home'){
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
  const shared=await request('Runtime.evaluate',{expression:`(()=>{const b=getComputedStyle(document.body),p=document.querySelector('#screen .admin-operations-intro,#screen .ngdm-wallet,#screen .ngdb-hero,#screen .ngdl-hero');return {role:document.body.dataset.appRole,canvas:b.backgroundColor,ink:b.getPropertyValue('--ngds-ink').trim(),radius:b.getPropertyValue('--ngds-radius').trim(),panel:p?{radius:getComputedStyle(p).borderRadius,border:getComputedStyle(p).borderTopWidth}:null};})()`,returnByValue:true});
  const theme=shared.result.value;console.log('NGD_SHARED_ROLE_THEME '+label+' '+JSON.stringify(theme));
  assert.equal(theme.canvas,'rgb(250, 249, 245)');assert.equal(theme.ink,'#111827');assert.equal(theme.radius,'12px');
  if(theme.panel){assert.equal(theme.panel.radius,'12px');assert.equal(theme.panel.border,'2px');}
  const component=await request('Runtime.evaluate',{expression:`(()=>{const q=s=>document.querySelector(s),style=e=>e?{bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color,fill:getComputedStyle(e).webkitTextFillColor,border:getComputedStyle(e).borderTopWidth,radius:getComputedStyle(e).borderRadius}:null;return {campaign:style(q('.ngd-catalog-campaign-slide')),campaignCTA:style(q('.ngd-catalog-campaign-cta')),dock:style(q('#member-mobile-nav .ngdm-dock-button')),dockActive:style(q('#member-mobile-nav .ngdm-dock-button[aria-current="page"]')),auth:style(q('.ngd-auth-v10 .btn-primary')),admin:style(q('.admin-operations-intro')),intro:style(q('.ngd-member-page-intro,.ai-catalog-intro,.learning-intro,.learning-portal-hero'))};})()`,returnByValue:true});
  const ui=component.result.value;console.log('NGD_COMPONENT_THEME '+label+' '+JSON.stringify(ui));
  const lime='rgb(200, 241, 53)',ink='rgb(17, 24, 39)',paper='rgb(255, 255, 255)';
  if(ui.campaign){assert.equal(ui.campaign.bg,ink,label+' catalogue banner surface');}
  for(const action of [ui.campaignCTA,ui.auth,ui.dockActive].filter(Boolean)){assert.equal(action.bg,lime,label+' primary background');assert.equal(action.fill,ink,label+' primary foreground');}
  for(const panel of [ui.admin,ui.intro].filter(Boolean))assert.equal(panel.bg,paper,label+' neutral main panel');
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
    assert.equal(h.bg,'rgb(17, 24, 39)','header should use ink background');
    assert.equal(h.title,'rgb(255, 255, 255)','brand title must be white on ink');
    assert.equal(h.iconBg,'rgb(200, 241, 53)','brand icon should be framed in lime');
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
      // The public CMS hero may be absent before its DRAFT is published.
      // Existing CSS and DOM overflow/contrast checks run even in loading state.
      if(v.hero)assert.ok(v.hero!=='rgba(0, 0, 0, 0)','Published CMS hero must be visible');
    }else{
      assert.equal(v.wallet,'rgb(17, 24, 39)','Member wallet shares ink surface with header and photo hero');
      assert.equal(v.chart,'rgb(200, 241, 53)','Member chart not acid lime');
      assert.equal(v.metric,'rgb(200, 241, 53)','First metric not lime');
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
      const simpleTitle=root?.querySelector('.ns-simple-intro h1')?.textContent||'';
      const steps=root?.querySelectorAll('.ns-simple-flow > .ns-simple-step').length||0;
      const styles=root?.querySelectorAll('[data-quick-style]').length||0;
      const advancedClosed=!!root?.querySelector('.ns-simple-advanced:not([open])');
      const onlyPrimary=!!root?.querySelector('#ns-quick-generate:disabled');
      const uploadFirst=!!root?.querySelector('#ns-upload');
      const initialEditor=!!root?.querySelector('.ns-v2-editor');
      const optionGroups=new Set([...root?.querySelectorAll('[data-v2-field]')||[]].map(el=>el.dataset.v2Field)).size;
      const overlayOff=!!root?.querySelector('#ns-v2-overlay:not(:checked)');
      const uploadFirstDisabled=!!root?.querySelector('#ns-generate:disabled');
      root?.querySelector('[data-view="gallery"]')?.click();
      const imageCards=root?.querySelectorAll('[data-template]').length||0;
      root?.querySelector('[data-template="kuliner-hangat"]')?.click();
      const editor=root?.querySelector('.ns-editor');
      const visibleCanvas=root?.querySelector('#ns-canvas');
      const ratio=visibleCanvas?visibleCanvas.width+'x'+visibleCanvas.height:'';
      return {root:!!root,initialCanvas:!!c,tabs:tabs.length,uploadFirst,initialEditor,optionGroups,overlayOff,uploadFirstDisabled,imageCards,editor:!!editor,ratio,width,documentWidth,adapter:before?.mode,simpleTitle,steps,styles,advancedClosed,onlyPrimary};
    })()`,returnByValue:true});
    const v=r.result.value;
    console.log('MOBILE_360_STUDIO '+JSON.stringify(v));
    assert.ok(v.root&&v.initialEditor&&v.initialCanvas&&v.uploadFirst&&v.overlayOff&&v.uploadFirstDisabled&&v.optionGroups===7,'P1 Img2Img V2 must start at photo-first 7-selector editor, overlay off');
    assert.equal(v.simpleTitle,'Ubah Foto HP Biasa Jadi Foto Produk Kelas Studio');
    assert.equal(v.steps,3);assert.equal(v.styles,4);
    assert.ok(v.advancedClosed&&v.onlyPrimary,'Technical editor closed; primary disabled until photo upload');
    assert.ok(v.imageCards===6&&v.editor,'P1 secondary inspiration gallery and editor must remain functional');
    assert.equal(v.adapter,'SIMULATION','P1 cannot use live credit adapter');
    assert.equal(v.ratio,'1080x1350','P1 Canvas resolution mismatch');
    assert.ok(v.documentWidth<=360,'P1 Studio overflow');
    const magazine=await request('Runtime.evaluate',{expression:"(()=>{\nconst root=document.getElementById('ngd-studio-root');\nroot.querySelector('[data-food-mode=\"food\"]')?.click();\nconst groups=new Set([...root.querySelectorAll('[data-food-field]')].map(x=>x.dataset.foodField));\nconst draft=window.NGD_STUDIO.foodMagazineDraft();\nconst initial={groups:[...groups],count:draft.payload.count,overlay:draft.payload.overlay_enabled,overflow:document.documentElement.scrollWidth};\nroot.querySelector('[data-food-field=\"cover_concept\"][data-food-value=\"dramatic\"]')?.click();\nconst preset=window.NGD_STUDIO.foodMagazineDraft().payload;\nconst forbidden=root.querySelector('[data-food-field=\"surface\"][data-food-value=\"plain_white\"]')?.disabled;\nroot.querySelector('[data-food-field=\"count\"][data-food-value=\"4\"]')?.click();\nconst selected=window.NGD_STUDIO.foodMagazineDraft();\nreturn {initial,preset:{lighting:preset.lighting,surface:preset.surface,grade:preset.grade},forbidden,count:selected.payload.count,cost:selected.estimated_total_credits,unit:selected.estimated_credits_per_image,overflow:document.documentElement.scrollWidth};\n})()",returnByValue:true});
    assert.ok(!magazine.exceptionDetails,'Food Magazine browser exception');
    const food=magazine.result.value;
    console.log('MOBILE_360_FOOD_MAGAZINE '+JSON.stringify(food));
    assert.equal(food.initial.groups.length,10,'Product category replaces legacy food_type selector; ten advanced groups remain');
    assert.equal(food.initial.count,1,'default one image');
    assert.equal(food.initial.overlay,false,'default overlay OFF');
    assert.equal(food.preset.lighting,'side');
    assert.equal(food.preset.surface,'dark_wood');
    assert.equal(food.forbidden,true,'conflicting white backdrop must be disabled');
    assert.equal(food.count,4);
    assert.equal(food.cost,food.unit*4);
    assert.ok(food.overflow<=360,'Food Magazine overflows 360px');

    const context=await request('Runtime.evaluate',{expression:"(()=>{const root=document.getElementById('ngd-studio-root');root.querySelector('[data-context-category=bottled_liquid]')?.click();const available=[...root.querySelectorAll('[data-context-scenario]')].map(x=>x.dataset.contextScenario);root.querySelector('[data-context-scenario=obsidian_mirror_splash]')?.click();const draft=window.NGD_STUDIO.foodMagazineDraft();return {available,category:draft.payload.product_category,scenario:draft.payload.studio_scenario,restoration:draft.payload.restoration_mode,overflow:document.documentElement.scrollWidth};})()",returnByValue:true});
    assert.ok(!context.exceptionDetails,'Context Skill Matrix browser exception');
    const match=context.result.value;
    console.log('MOBILE_360_CONTEXT_MATRIX '+JSON.stringify(match));
    assert.equal(match.category,'bottled_liquid');
    assert.equal(match.scenario,'obsidian_mirror_splash');
    assert.equal(match.restoration,'full_phone_restoration');
    assert.equal(match.available.length,3,'Only three bottle scenarios available');
    assert.ok(!match.available.includes('steam_broth_hero'),'Soup scenario hidden for bottle');
    assert.ok(match.overflow<=360,'Context matrix overflows 360px');

    const machine=await request('Runtime.evaluate',{expression:"(()=>{const root=document.getElementById('ngd-studio-root');const initial=window.NGD_STUDIO.foodMagazineDraft();const original=root.querySelector('#ns-food-pricing')?.textContent||'';const options=root.querySelectorAll('[data-food-machine]').length;root.querySelector('[data-food-machine=gemini_flash_image]').click();const gemini=window.NGD_STUDIO.foodMagazineDraft();const summary=root.querySelector('#ns-food-pricing')?.textContent||'';root.querySelector('[data-food-machine=flux_2_pro]').click();const hd=window.NGD_STUDIO.foodMagazineDraft();return {initial,original,options,gemini,summary,hd,overflow:document.documentElement.scrollWidth};})()",returnByValue:true});
    assert.ok(!machine.exceptionDetails,'Visual machine selector exception');
    const pick=machine.result.value;
    console.log('MOBILE_360_VISUAL_MACHINES '+JSON.stringify({initial:pick.initial.machine_id,options:pick.options,gemini:pick.gemini.estimated_total_credits,hd:pick.hd.estimated_total_credits,overflow:pick.overflow}));
    assert.equal(pick.options,3,'Exactly three visual machine choices');
    assert.equal(pick.initial.machine_id,'flux_kontext_pro','Recommended Kontext default');
    assert.equal(pick.initial.estimated_total_credits,12,'4 images × Kontext 3 credits');
    assert.equal(pick.gemini.estimated_total_credits,8,'4 images × Gemini 2 credits');
    assert.equal(pick.hd.estimated_total_credits,16,'4 images × Flux2 4 credits');
    assert.match(pick.summary,/2 kredit × 4 hasil = 8 kredit/);
    assert.ok(pick.overflow<=360,'Visual machine picker 360px overflow');
    const preflight=await request('Runtime.evaluate',{expression:"(async()=>{\n const root=document.getElementById('ngd-studio-root');\n async function upload(mode){\n  const c=document.createElement('canvas');c.width=128;c.height=128;\n  const ctx=c.getContext('2d');\n  if(mode==='dark'){ctx.fillStyle='#030303';ctx.fillRect(0,0,128,128);}\n  else{\n   for(let y=0;y<128;y+=8)for(let x=0;x<128;x+=8){\n    ctx.fillStyle=((x+y)/8)%2===0?'#fff':'#121212';ctx.fillRect(x,y,8,8);\n   }\n  }\n  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));\n  const transfer=new DataTransfer();transfer.items.add(new File([blob],mode+'.png',{type:'image/png'}));\n  const input=root.querySelector('#ns-file');input.files=transfer.files;\n  input.dispatchEvent(new Event('change',{bubbles:true}));\n  await new Promise(resolve=>setTimeout(resolve,350));\n  return {message:root.querySelector('#ns-food-quality')?.textContent||'',\n   disabled:root.querySelector('#ns-generate')?.disabled,\n   overflow:document.documentElement.scrollWidth};\n }\n return {dark:await upload('dark'),clear:await upload('clear')};\n})()",returnByValue:true,awaitPromise:true});
    assert.ok(!preflight.exceptionDetails,'Food preflight browser exception');
    const quality=preflight.result.value;
    console.log('MOBILE_360_FOOD_PREFLIGHT '+JSON.stringify(quality));
    assert.equal(quality.dark.disabled,true,'extremely dark image must block Generate');
    assert.match(quality.dark.message,/Peringatan foto/);
    assert.equal(quality.clear.disabled,false,'clear well-lit image must enable Generate');
    assert.match(quality.clear.message,/lolos pemeriksaan/);
    assert.ok(quality.clear.overflow<=360);

    const inspiration=await request('Runtime.evaluate',{expression:"(()=>{const root=document.getElementById('ngd-studio-root');root.querySelector('[data-view=gallery]')?.click();const initial=root.querySelectorAll('[data-scene-card]').length;const classic=root.querySelectorAll('[data-template]').length;root.querySelector('[data-template-filter=bottled_liquid]')?.click();const bottles=[...root.querySelectorAll('[data-scene-card]')].map(v=>v.dataset.sceneCard);const details=root.querySelector('[data-template-detail]');details?.click();const expanded=!!root.querySelector('.ns-inspire-detail');root.querySelector('[data-scene-template=scene__bottled_liquid__obsidian_mirror_splash]')?.click();const draft=window.NGD_STUDIO.foodMagazineDraft();return {initial,classic,bottles,expanded,category:draft.payload.product_category,scenario:draft.payload.studio_scenario,editor:!!root.querySelector('.ns-v2-editor'),presetButton:!!root.querySelector('#ns-save-preset'),overflow:document.documentElement.scrollWidth};})()",returnByValue:true});
    assert.ok(!inspiration.exceptionDetails,'Inspiration gallery browser exception');
    const library=inspiration.result.value;
    console.log('MOBILE_360_INSPIRATION_REUSE '+JSON.stringify(library));
    assert.equal(library.initial,12,'Twelve contextual studio templates');
    assert.equal(library.classic,6,'Six legacy Canvas designs remain usable');
    assert.equal(library.bottles.length,3,'Bottle filter returns only relevant scenarios');
    assert.equal(library.expanded,true,'Template detail shows editable recipe scope');
    assert.equal(library.category,'bottled_liquid');
    assert.equal(library.scenario,'obsidian_mirror_splash');
    assert.equal(library.editor,true);
    assert.equal(library.presetButton,true);
    assert.ok(library.overflow<=360,'Inspiration gallery and applied editor overflows 360px');

    mkdirSync('mobile-qa-artifacts',{recursive:true});
    const shot=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    writeFileSync('mobile-qa-artifacts/member-studio-360x800.png',Buffer.from(shot.data,'base64'));
  }
  if(label==='member-home'){
    const walletStyle=await request('Runtime.evaluate',{expression:`(()=>{const labels=[...document.querySelectorAll('.ngdm-wallet-numbers>p:first-child,.ngdm-wallet-hint,.ngdm-wallet-number>span')];const grid=document.querySelector('.ngdm-shortcuts');return {colors:labels.map(e=>getComputedStyle(e).webkitTextFillColor),columns:grid?getComputedStyle(grid).gridTemplateColumns.split(' ').length:0};})()`,returnByValue:true});
    const wallet=walletStyle.result.value;console.log('NGD_WALLET_TEXT '+JSON.stringify(wallet));assert.ok(wallet.colors.length>=2&&wallet.colors.every(c=>c==='rgb(255, 255, 255)'),'wallet secondary text must be white on ink');assert.equal(wallet.columns,2,'mobile shortcut grid should be two columns');
    const welcome=await request('Runtime.evaluate',{expression:"(()=>{const quick=document.querySelector('#screen .ngdm-quick');const wallet=document.querySelector('#screen .ngdm-wallet');const choices=[...quick?.querySelectorAll('.ngdm-shortcut')||[]].map(x=>({label:x.querySelector('strong')?.textContent||'',route:x.dataset.route,tool:x.dataset.aiOpen||''}));return {quickBeforeWallet:!!quick&&!!wallet&&quick.compareDocumentPosition(wallet)&Node.DOCUMENT_POSITION_FOLLOWING,choices,summary:document.querySelector('.ngdm-greeting p:last-child')?.textContent||'',width:document.documentElement.scrollWidth};})()",returnByValue:true});
    assert.ok(!welcome.exceptionDetails,'First-run member welcome browser exception');
    const novice=welcome.result.value;
    console.log('MOBILE_360_MEMBER_FIRST_STEP '+JSON.stringify(novice));
    assert.ok(novice.quickBeforeWallet,'Beginner actions must appear before token metrics');
    assert.equal(novice.choices.length,4);
    assert.deepEqual(novice.choices.map(x=>x.route),['ai','portal','katalog','affiliate'],
      'Four member actions must follow the published Doc 06 CMS route contract');
    assert.ok(novice.choices.every(x=>x.label==='Sedang memuat informasi...'),
      'Unpublished member content must show a neutral message, never fake campaign copy');
    assert.ok(novice.width<=360,'Beginner member home overflows 360px');
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
      ['guest-home',''],['guest-catalog','#katalog'],['guest-services','#jasa'],['guest-help','#dukungan'],['guest-login','#login'],
      ['member-home','?preview=member#beranda'],
      ['member-catalog','?preview=member#katalog'],
      ['member-services','?preview=member#jasa'],
      ['member-ai','?preview=member#ai'],
      ['member-studio','?preview=member#ai-tool/ngulik-visual'],
      ['member-learning','?preview=member#belajar'],['member-portal','?preview=member#portal'],
      ['member-support','?preview=member#dukungan'],
      ['member-account','?preview=member#akun'],
      ['member-referral','?preview=member#affiliate'],
      ['member-order-list','?preview=member#pesanan'],
      ['admin-home','?preview=admin#admin'],
      ['admin-catalog','?preview=admin#produk'],
      ['admin-members','?preview=admin#member'],
      ['admin-lms','?preview=admin#lms'],['admin-content','?preview=admin#konten'],['admin-settings','?preview=admin#pengaturan'],['admin-support','?preview=admin#tiket'],
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
    assert.equal(pcColors.wallet,'rgb(17, 24, 39)','PC wallet must use canonical ink surface');
    assert.equal(pcColors.chart,'rgb(200, 241, 53)','PC wallet chart must use Studio lime');
    assert.equal(pcColors.lastMetric,'rgb(17, 24, 39)','PC third metric must be ink');
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
    assert.equal(brandChrome.head,'rgb(17, 24, 39)');
    assert.equal(brandChrome.nav,'rgb(17, 24, 39)');
    assert.equal(brandChrome.active,'rgb(200, 241, 53)');
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
    for(const [label,part] of [['guest-catalog','#katalog'],['guest-services','#jasa'],['guest-help','#dukungan'],['member-learning','?preview=member#belajar'],['admin-home','?preview=admin#admin'],['admin-content','?preview=admin#konten'],['admin-settings','?preview=admin#pengaturan']]){
      await request('Page.navigate',{url:host+part});await pause(1500);
      const probe=await request('Runtime.evaluate',{expression:jsCheck,returnByValue:true,awaitPromise:true});
      assert.ok(!probe.exceptionDetails,label+' desktop exception');assert.ok(probe.result.value.screen&&probe.result.value.scrollWidth<=1366,label+' desktop overflow');
      assert.deepEqual(probe.result.value.critical,[],label+' desktop clipped elements');
      const shot=await request('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
      writeFileSync('mobile-qa-artifacts/'+label+'-1366x800.png',Buffer.from(shot.data,'base64'));
    }
    console.log('NGD_SHARED_DESKTOP_ROUTES_OK');
  }finally{
    try{ws?.close();}catch(e){}
    child.kill('SIGTERM');
    rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:120});
  }
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});

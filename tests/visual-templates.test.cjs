'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fixture={name:'Kemasan Madu Ku',product_category:'bottled_liquid',studio_scenario:'obsidian_mirror_splash',
 restoration_mode:'full_phone_restoration',format:'4:5',machine_id:'flux_kontext_pro',
 count:1,overlay_enabled:false,brand_name:'',headline:'',tagline:'',price_label:'',brand_hex:''};
function server(){
 const c=vm.createContext({console});
 vm.runInContext(read('apps-script/VisualSkills.gs'),c);
 vm.runInContext(read('apps-script/VisualTemplates.gs'),c);
 return c;
}
test('public visual matrix exposes 12 selectable templates with matching scene IDs',()=>{
 const store=new Map(),window={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
 vm.runInNewContext(read('js/ai-studio.js'),{window,console});
 const api=window.NGD_STUDIO;
 const list=api.studioTemplateCatalog();
 assert.equal(list.length,12);
 assert.equal(new Set(list.map(x=>x.id)).size,12);
 assert.equal(list.filter(x=>x.category==='bottled_liquid').length,3);
 assert.equal(list.some(x=>x.scenario==='obsidian_mirror_splash'),true);
 assert.equal(api.useScenarioTemplate('scene__bottled_liquid__obsidian_mirror_splash'),true);
 const draft=api.foodMagazineDraft();
 assert.equal(draft.payload.product_category,'bottled_liquid');
 assert.equal(draft.payload.studio_scenario,'obsidian_mirror_splash');
 assert.equal(draft.payload.restoration_mode,'full_phone_restoration');
 assert.equal(draft.image_source_selected,false);
 assert.equal(api.useScenarioTemplate('scene__bottled_liquid__steam_broth_hero'),false);
});
test('local presets persist across reload by member but never reuse another member data or raw image',async()=>{
 const memory=new Map();
 const win=()=>({localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});
 const first=win();vm.runInNewContext(read('js/ai-studio.js'),{window:first,console});
 const a=first.NGD_STUDIO;a.configureMemberScope('M-0009');
 assert.equal(a.useScenarioTemplate('scene__bottled_liquid__obsidian_mirror_splash'),true);
 a.setPresetName('Madu Ku komersial');
 await a.saveTemplatePreset();
 assert.equal(a.savedTemplates().length,1);
 const item=a.savedTemplates()[0];
 assert.equal(item.product_category,'bottled_liquid');
 const saved=JSON.stringify([...memory.values()]);
 assert.equal(saved.includes('data:image'),false);
 assert.equal(saved.includes('NGD_KEY_'),false);
 const again=win();vm.runInNewContext(read('js/ai-studio.js'),{window:again,console});
 const b=again.NGD_STUDIO;b.configureMemberScope('M-0009');
 assert.equal(b.savedTemplates().length,1);
 assert.equal(b.applySavedTemplate(item),true);
 assert.equal(b.foodMagazineDraft().payload.studio_scenario,'obsidian_mirror_splash');
 b.configureMemberScope('M-0010');
 assert.equal(b.savedTemplates().length,0);
 b.configureMemberScope('M-0009');
 assert.equal(b.savedTemplates().length,1);
 await b.deleteTemplatePreset(item.id);
 assert.equal(b.savedTemplates().length,0);
});
test('server refuses category spoofing, unsafe fields, invalid prices and mismatched scenarios',()=>{
 const c=server();
 function valid(d){return c.ngdVisualTemplateValidate_(vm.runInContext('('+JSON.stringify(d)+')',c));}
 const out=valid(fixture);
 assert.equal(out.name,'Kemasan Madu Ku');
 assert.equal(out.machine_id,'flux_kontext_pro');
 for(const bad of [
  {...fixture,studio_scenario:'steam_broth_hero'},
  {...fixture,product_category:'__proto__'},
  {...fixture,machine_id:'paid_admin_only'},
  {...fixture,count:99},
  {...fixture,format:'1920:1080'},
  {...fixture,reference_image:'https://private.example/img'},
  {...fixture,secret:'abc'},
  {...fixture,name:'<script>x</script>'}
 ])assert.throws(()=>valid(bad));
});
test('private member template service delegates only server-authenticated ownership',()=>{
 const c=server(),all=new Map(),calls=[];
 const auth={requireMember:token=>token==='tokenAlice'?{member_id:'M-0009'}:
  token==='tokenBob'?{member_id:'M-0010'}:null};
 // ngdVjSession_ is provided by VisualJobs in deployed runtime.
 vm.runInContext(read('apps-script/VisualJobs.gs'),c);
 const store={templates:{
  list:member=>{calls.push(member);return all.get(member)||[]},
  save:(member,id,draft)=>{calls.push(member);const arr=all.get(member)||[];
   const val={...draft,id:id||'vt_12345678901234'};arr.push(val);all.set(member,arr);return val},
  remove:(member,id)=>{calls.push(member);all.set(member,[]);return {removed:true,id}}
 }};
 const api=c.ngdVisualMemberTemplates_(auth,store);
 const a=api.save('tokenAlice',vm.runInContext('('+JSON.stringify(fixture)+')',c));
 assert.equal(a.id,'vt_12345678901234');
 assert.equal(api.list('tokenBob').length,0);
 assert.equal(api.list('tokenAlice').length,1);
 assert.throws(()=>api.list('forged'),/SESSION_REQUIRED/);
 assert.ok(calls.every(x=>x==='M-0009'||x==='M-0010'));
});
test('template storage bridge requires list/save/remove and never activates providers',async()=>{
 const w={};vm.runInNewContext(read('js/ai-studio.js'),{window:w,console});
 const api=w.NGD_STUDIO;
 await assert.rejects(api.configureTemplateStorage({list:()=>[]}),/VISUAL_TEMPLATE_STORAGE_INVALID/);
 await api.configureTemplateStorage({list:async()=>[],save:async()=>null,remove:async()=>null});
 assert.equal(api.adapterMode,'SIMULATION');
 await api.configureTemplateStorage(null);
});

test('beginner studio keeps four locked quick styles and does not expose arbitrary prompt or image URLs',()=>{
 const w={};vm.runInNewContext(read('js/ai-studio.js'),{window:w,console});
 const studio=w.NGD_STUDIO;
 const presets=studio.quickStyles();
 assert.deepEqual(Array.from(presets,x=>String(x.name)),['Katalog Bersih','Kuliner Hangat','Percikan Dinamis','Hitam Mewah']);
 assert.equal(studio.quickStyleSelect('luxury'),true);
 const draft=studio.foodMagazineDraft();
 assert.equal(draft.payload.product_category,'bottled_liquid');
 assert.equal(draft.payload.studio_scenario,'obsidian_mirror_splash');
 assert.equal(draft.payload.restoration_mode,'full_phone_restoration');
 assert.equal(studio.quickStyleSelect('script:inject'),false);
 assert.equal(studio.quickStyleSelect('culinary'),true);
 assert.equal(studio.foodMagazineDraft().payload.studio_scenario,'steam_broth_hero');
});

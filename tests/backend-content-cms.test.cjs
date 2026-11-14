'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const code=read('apps-script/Code.gs'),content=read('apps-script/Content.gs');
const sample=(patch={})=>({
  kind:'HERO',placement:'home',title:'Kelas untuk UMKM',
  description:'Mulai belajar bersama Ngulik Digital.',
  image_path:'assets/media/banner-umkm.webp',cta_label:'Lihat kelas',cta_route:'belajar',
  sort_order:1,start_date:'',end_date:'',
  ...patch
});
function fixture(){
  const rows=[],audits=[];let writes=0;
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}},
    Utilities:{formatDate(){return '2026-11-14';}}});
  vm.runInContext(code,ctx,{timeout:10000});
  vm.runInContext(content,ctx,{timeout:10000});
  ctx.sha256_=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
  ctx.withLock_=fn=>fn();
  ctx.now_=()=>new Date('2026-11-14T04:00:00Z');
  ctx.readAll_=name=>name==='site_content'?rows:[];
  ctx.byId_=(name,col,id)=>name==='site_content'?rows.find(r=>r[col]===id)||null:null;
  ctx.appendRow_=(name,row)=>{assert.equal(name,'site_content');writes++;rows.push({...row,_row:rows.length+2});};
  ctx.updateRow_=(name,row,patch)=>{assert.equal(name,'site_content');writes++;Object.assign(rows[row-2],patch);};
  ctx.logAudit_=(...args)=>audits.push(args);
  const admin={member_id:'M-ADMIN',role:'ADMIN'};
  return {ctx,rows,audits,create:(p=sample(),rid='CONTENT_REQUEST_12345678')=>
      ctx.contentCreate_(admin,p,rid),
    update:p=>ctx.contentUpdate_(admin,p),status:p=>ctx.contentSetStatus_(admin,p),
    get writes(){return writes;}};
}
test('CMS creates draft, idempotently retries and publishes only after admin approval',()=>{
  const h=fixture(),one=h.create();
  assert.match(one.item.content_id,/^C-[A-F0-9]{14}$/);
  assert.equal(one.item.status,'DRAFT');
  assert.equal(h.ctx.contentPublicList_().length,0);
  assert.equal(h.create().already_created,true);
  assert.equal(h.writes,1);
  const published=h.status({content_id:one.item.content_id,revision:one.item.revision,status:'PUBLISHED'});
  assert.equal(published.item.status,'PUBLISHED');
  const list=h.ctx.contentPublicList_();
  assert.equal(list.length,1);
  assert.equal(list[0].image_path,'assets/media/banner-umkm.webp');
  for(const key of ['created_by','request_id','revision','_row','status'])assert.equal(Object.hasOwn(list[0],key),false,key);
  assert.throws(()=>h.create(sample({title:'Changed'})),/konten lain/);
  assert.equal(h.rows.length,1);
});
test('CMS supports revision-safe edits, unpublish, soft archive and recovery',()=>{
  const h=fixture(),one=h.create().item;
  const changed=h.update({...sample({title:'Program Baru'}),content_id:one.content_id,revision:one.revision});
  assert.equal(changed.updated,true);
  assert.notEqual(changed.item.revision,one.revision);
  assert.throws(()=>h.update({...sample({title:'Stale'}),content_id:one.content_id,revision:one.revision}),/diubah/);
  assert.throws(()=>h.update({...sample({kind:'PAGE_COVER',placement:'belajar'}),content_id:one.content_id,revision:changed.item.revision}),/tidak dapat diubah/);
  const live=h.status({content_id:one.content_id,status:'PUBLISHED',revision:changed.item.revision});
  const archived=h.status({content_id:one.content_id,status:'ARCHIVED',revision:live.item.revision});
  assert.equal(h.ctx.contentPublicList_().length,0);
  assert.throws(()=>h.status({content_id:one.content_id,status:'PUBLISHED',revision:archived.item.revision}),/Pulihkan arsip/);
  const restored=h.status({content_id:one.content_id,status:'DRAFT',revision:archived.item.revision});
  assert.equal(restored.item.status,'DRAFT');
  assert.equal(h.rows.length,1);
  assert.ok(h.audits.some(a=>a[2]==='CONTENT_STATUS'));
});
test('CMS requires same-origin image paths and known placements, rejects unsafe inputs without writes',()=>{
  const h=fixture();
  const invalid=[
    sample({image_path:'https://evil.invalid/banner.webp'}),
    sample({image_path:'../secrets.png'}),
    sample({image_path:'assets/media/../../confidential.png'}),
    sample({image_path:'assets/media/img.svg'}),
    sample({image_path:'assets/media/image.webp?code=123'}),
    sample({image_path:'assets/media/folder//image.png'}),
    sample({placement:'other'}),
    sample({kind:'PRODUCT_IMAGE',placement:'../../members'}),
    sample({cta_route:'javascript:alert(1)'}),
    sample({cta_label:'Pesan',cta_route:''}),
    sample({start_date:'2026-11-31'}),
    sample({start_date:'2026-12-01',end_date:'2026-11-30'}),
    sample({sort_order:-1}),
    sample({unknown_field:'bad'}),
  ];
  for(const payload of invalid)assert.throws(()=>h.create(payload),/tidak valid|diizinkan|dikenali|memiliki tujuan|tidak boleh|path lokal|tidak dikenal/);
  assert.equal(h.writes,0);
  assert.equal(h.rows.length,0);
});
test('scheduled campaigns honor Jakarta-local start and end date inclusively',()=>{
  const h=fixture(),a=h.create(sample({start_date:'2026-11-14',end_date:'2026-11-14'}),'SCHEDULE_CONTENT_123456').item;
  h.status({content_id:a.content_id,status:'PUBLISHED',revision:a.revision});
  assert.equal(h.ctx.contentPublicList_().length,1);
  const b=h.create(sample({start_date:'2026-11-15'}),'SCHEDULE_CONTENT_999999').item;
  h.status({content_id:b.content_id,status:'PUBLISHED',revision:b.revision});
  const c=h.create(sample({end_date:'2026-11-13'}),'SCHEDULE_CONTENT_000000').item;
  h.status({content_id:c.content_id,status:'PUBLISHED',revision:c.revision});
  assert.equal(h.ctx.contentPublicList_().length,1);
});
test('CMS endpoints are admin-only with separate release switch; no external requests',()=>{
  const h=fixture();
  h.ctx.activeMember_=()=>({member_id:'M1',role:'MEMBER',status:'AKTIF'});
  h.ctx.admin_=()=>{throw h.ctx.ngdError_('FORBIDDEN','Admin required');};
  assert.throws(()=>h.ctx.apiRouter_('adminListContent','USER',{},''),/Admin required/);
  assert.throws(()=>h.ctx.apiRouter_('adminCreateContent','USER',sample(),'RID_123456789012345'),/Admin required/);
  assert.equal(h.writes,0);
  assert.match(code,/NGD_CONTENT_ENABLED/);
  for(const action of ['getPublicContent','adminListContent','adminCreateContent','adminUpdateContent','adminSetContentStatus'])
    assert.ok(code.includes("'"+action+"'"),action);
  assert.ok(code.includes("case 'getPublicContent':return contentPublicList_()"));
  assert.ok(read('config.js').includes('contentEnabled: false'));
  assert.doesNotMatch(content,/UrlFetchApp|MailApp|GmailApp|DriveApp/);
});

test('schema migration is staging-only, id-confirmed, forward-only, and idempotent',()=>{
  const h=fixture();
  const properties={
    NGD_DB_ID:'STAGING-1234',NGD_ENVIRONMENT:'PRODUCTION',
    NGD_CONTENT_MIGRATION_ENABLED:'true',NGD_CONTENT_MIGRATION_TARGET_ID:'STAGING-1234'
  };
  h.ctx.PropertiesService={getScriptProperties(){return {
    getProperty:key=>properties[key]||''
  };}};
  const headers=Object.fromEntries(Object.entries(vm.runInContext('NGD.HEADERS',h.ctx)));
  const tables={};
  for(const [name,csv] of Object.entries(headers)){
    if(name==='site_content')continue;
    tables[name]={getLastColumn(){return csv.split(',').length;},
      getRange(){return {getValues(){return [csv.split(',')];}};}};
  }
  let created=0,reads=0;
  h.ctx.SpreadsheetApp={
    openById(id){
      reads++;
      assert.equal(id,'STAGING-1234');
      return {
        getSheetByName(name){return tables[name]||null;},
        insertSheet(name){
          created++;
          const rec={columns:26,rows:[],getMaxColumns(){return this.columns;},
            insertColumnsAfter(_at,n){this.columns+=n;},
            getLastColumn(){return this.rows.length?this.rows[0].length:0;},
            getRange(){return {setValues:vals=>{rec.rows=vals;},getValues:()=>rec.rows};},
            setFrozenRows(){}};
          tables[name]=rec;return rec;
        }
      };
    },flush(){}
  };
  assert.throws(()=>h.ctx.installContentSchemaStaging(),/dibatasi ke staging/);
  assert.equal(reads,0);
  properties.NGD_ENVIRONMENT='STAGING';
  properties.NGD_CONTENT_MIGRATION_TARGET_ID='OTHER-ID';
  assert.throws(()=>h.ctx.installContentSchemaStaging(),/dibatasi ke staging/);
  properties.NGD_CONTENT_MIGRATION_TARGET_ID='STAGING-1234';
  const first=h.ctx.installContentSchemaStaging();
  assert.equal(first.created,true);
  assert.equal(first.tabs_checked,27);
  assert.equal(created,1);
  const second=h.ctx.installContentSchemaStaging();
  assert.equal(second.created,false);
  assert.equal(created,1);
  assert.equal(tables.site_content.rows[0].join(','),headers.site_content);
});

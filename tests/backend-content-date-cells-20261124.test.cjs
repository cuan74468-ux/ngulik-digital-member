'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Content.gs'),'utf8');
const today='2026-11-24';
const localDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',
 year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
function boot(rows){
 const sandbox={
  NGD:{TZ:'Asia/Jakarta'},now_:()=>new Date('2026-11-24T06:00:00Z'),
  Utilities:{formatDate:(d,tz,fmt)=>{
   assert.equal(tz,'Asia/Jakarta');
   assert.equal(fmt,'yyyy-MM-dd');
   return localDay(d);
  }},
  readAll_:name=>{assert.equal(name,'site_content');return rows;}
 };
 vm.runInNewContext(source,sandbox,{timeout:5000});
 return sandbox;
}
const base={kind:'HERO',placement:'home',title:'Judul dari CMS',
 description:'',image_path:'',cta_label:'',cta_route:'',sort_order:1,status:'PUBLISHED'};
test('Google Sheets date-formatted Date cells do not hide PUBLISHED 24 Nov entries',()=>{
 const rows=[{...base,content_id:'CNT-HERO-MAIN',
  start_date:new Date('2026-11-23T17:00:00Z'),
  end_date:new Date('2027-12-30T17:00:00Z')}];
 const result=boot(rows).contentPublicList_();
 assert.equal(result.length,1);
 assert.equal(result[0].content_id,'CNT-HERO-MAIN');
});
test('date-only text, serial numbers and blank ranges remain supported',()=>{
 const rows=[
  {...base,content_id:'CNT-HERO-MAIN',start_date:'2026-11-24',end_date:'2027-12-31'},
  {...base,content_id:'CNT-HERO-SECONDARY',kind:'HERO_ACTION',start_date:46350,end_date:46752},
  {...base,content_id:'CNT-PILL-01',kind:'HIGHLIGHT_PILL',start_date:'',end_date:''}
 ];
 const result=boot(rows).contentPublicList_();
 assert.deepEqual([...result.map(x=>x.content_id)],rows.map(x=>x.content_id));
});
test('archived, future, expired and malformed ranges fail closed without writes',()=>{
 const rows=[
  {...base,content_id:'CNT-HERO-MAIN',status:'ARCHIVED',start_date:46350,end_date:46752},
  {...base,content_id:'CNT-FUTURE',start_date:'2026-12-01',end_date:''},
  {...base,content_id:'CNT-EXPIRED',start_date:'2026-11-01',end_date:'2026-11-23'},
  {...base,content_id:'CNT-INVALID',start_date:'24/11/2026',end_date:''},
  {...base,content_id:'CNT-BAD-DATE',start_date:'2026-02-30',end_date:''}
 ];
 assert.deepEqual([...boot(rows).contentPublicList_()],[]);
});
test('date normalization respects Asia/Jakarta local midnight',()=>{
 const c=boot([]);
 assert.equal(c.ngdContentDateCell_(new Date('2026-11-23T17:00:00Z')),today);
 assert.equal(c.ngdContentDateCell_(new Date('invalid')),null);
});

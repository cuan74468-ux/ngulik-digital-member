'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const crypto=require('node:crypto');
const source=read('apps-script/AdminLegacyCms.gs');
function fixture({environment='STAGING',mutations=true,role='ADMIN'}={}){
  const tables={ai_tools:[],modul_belajar:[],etalase_affiliate_luar:[]};
  let writes=0;const admin={role,member_id:'M-ADMIN'};
  const config={NGD_ENVIRONMENT:environment,NGD_ADMIN_LOGIN_DB_ID:'STAGING-ID-123456',
    NGD_DB_ID:'STAGING-ID-123456'};
  const ctx=vm.createContext({
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>config[k]||''})},
    ngdStagingWorkspaceInfo_:()=>environment==='STAGING'?
      {environment:'STAGING',workspace:'NGD_STAGING',admin_login_enabled:true}:
      {environment:'PRODUCTION',workspace:'',admin_login_enabled:false},
    require_:(ok,code)=>{if(!ok)throw Error(code);},
    requireMutationsEnabled_:()=>{if(!mutations)throw Error('MAINTENANCE');},
    readAll_:table=>tables[table],
    byId_:(table,column,id)=>tables[table]?.find(row=>String(row[column])===id)||null,
    appendRow_:(table,record)=>{writes++;tables[table].push({...record,_row:tables[table].length+2});},
    updateRow_:(table,row,patch)=>{writes++;Object.assign(tables[table][row-2],patch);},
    withLock_:fn=>fn(),
    logAudit_:()=>{},
    safeText_:(text,max)=>String(text).slice(0,max),
    sha256_:value=>crypto.createHash('sha256').update(value).digest('hex')
  });
  vm.runInContext(source,ctx,{timeout:1000});
  function params(table,id,values,is_new=true,revision=''){
    return {table,id,values,is_new,revision};
  }
  return {ctx,tables,params,admin,get writes(){return writes;}};
}
const tool=(over={})=>({
 nama:'Tool caption',deskripsi:'Tulis caption',
 placeholder_input:'Nama produk',prompt_template:'Tulis promosi dengan sopan',
 kredit_biaya:1,aktif:true,urut:1,...over
});
const learningRow=(over={})=>({
 urut:1,judul:'Panduan NIB',deskripsi:'Prosedur resmi',
 url_classroom:'https://oss.go.id/id',aktif:true,...over
});
const shelf=(over={})=>({
 judul:'Aplikasi produk',kategori:'Alat usaha',deskripsi_singkat:'Membantu penjualan',
 alasan_rekomendasi:'Relevan dengan UMKM',harga_info:'Lihat penyedia',
 link_affiliate:'https://example.org/?ref=ABC123',gambar_url:'https://example.org/photo.webp',
 urut:1,aktif:true,catatan_admin:'Diverifikasi',...over
});
test('new CMS modules are valid GAS V8 JS and reject non-STAGING even on read',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
 const prod=fixture({environment:'PRODUCTION'});
 assert.throws(()=>prod.ctx.ngdLegacyCmsList_({table:'ai_tools'}),/FORBIDDEN/);
 assert.equal(prod.writes,0);
 assert.throws(()=>prod.ctx.ngdLegacyCmsSpec_('__proto__'),/VALIDATION/);
 assert.throws(()=>prod.ctx.ngdLegacyCmsSpec_('constructor'),/VALIDATION/);
});
test('all three tables allow draft creation and prevent mutation when master gate OFF',()=>{
 for(const [table,id,values] of [
   ['ai_tools','TOOL_20261124',tool()],
   ['modul_belajar','MOD_20261124',learningRow()],
   ['etalase_affiliate_luar','AFF_20261124',shelf()]
 ]){
   const blocked=fixture({mutations:false});
   assert.throws(()=>blocked.ctx.ngdLegacyCmsSave_(blocked.admin,blocked.params(table,id,values),'REQUEST_ID_123456789'),/MAINTENANCE/);
   assert.equal(blocked.writes,0);
   const f=fixture();
   const created=f.ctx.ngdLegacyCmsSave_(f.admin,f.params(table,id,values),'REQUEST_ID_123456789');
   assert.equal(created.created,true);
   assert.equal(created.item.aktif,false,'creation must always begin unpublished');
   assert.equal(f.writes,1);
   assert.equal(f.ctx.ngdLegacyCmsList_({table}).length,1);
 }
});
test('legacy admin edits are revision guarded and financial/click counters are immutable',()=>{
 const f=fixture();
 const first=f.ctx.ngdLegacyCmsSave_(f.admin,f.params('etalase_affiliate_luar','AFF_20261124',shelf()),'REQUEST_ID_123456789');
 const record=f.tables.etalase_affiliate_luar[0];
 record.klik_total=142;
 const old=f.ctx.ngdLegacyCmsList_({table:'etalase_affiliate_luar'})[0];
 assert.equal(old.klik_total,142);
 assert.throws(()=>f.ctx.ngdLegacyCmsSave_(f.admin,f.params('etalase_affiliate_luar','AFF_20261124',shelf({klik_total:999}),false,old.revision),'REQUEST_ID_123456790'),/VALIDATION/);
 const updated=f.ctx.ngdLegacyCmsSave_(f.admin,f.params('etalase_affiliate_luar','AFF_20261124',shelf({judul:'Pilihan resmi',aktif:false}),false,old.revision),'REQUEST_ID_123456790');
 assert.equal(updated.updated,true);
 assert.equal(record.klik_total,142);
 assert.equal(record.judul,'Pilihan resmi');
 assert.throws(()=>f.ctx.ngdLegacyCmsSave_(f.admin,f.params('etalase_affiliate_luar','AFF_20261124',shelf(),false,old.revision),'REQUEST_ID_123456790'),/CONFLICT/);
 assert.equal(first.item.aktif,false);
});
test('visual/image AI tools are MODE SIMULASI and cannot become active through CMS',()=>{
 const f=fixture();
 assert.throws(()=>f.ctx.ngdLegacyCmsSave_(f.admin,f.params('ai_tools','ngulik-visual',tool({nama:'Buat Foto',aktif:true})),'REQUEST_ID_123456789'),/MAINTENANCE/);
 assert.equal(f.writes,0);
 const added=f.ctx.ngdLegacyCmsSave_(f.admin,f.params('ai_tools','ngulik-visual',tool({nama:'Buat Foto',aktif:false})),'REQUEST_ID_123456789');
 assert.equal(added.item.aktif,false);
 assert.throws(()=>f.ctx.ngdLegacyCmsSave_(f.admin,f.params('ai_tools','ngulik-visual',tool({nama:'Buat Foto',aktif:true}),false,added.item.revision),'REQUEST_ID_123456790'),/MAINTENANCE/);
 assert.equal(f.writes,1);
});
test('invalid affiliate HTTP links and unknown table cannot write',()=>{
 const f=fixture();
 assert.throws(()=>f.ctx.ngdLegacyCmsSave_(f.admin,f.params('etalase_affiliate_luar','AFF_20261124',shelf({link_affiliate:'javascript:alert(1)'})),'REQUEST_ID_123456789'),/VALIDATION/);
 assert.throws(()=>f.ctx.ngdLegacyCmsSave_(f.admin,f.params('unknown_table','OTHER_20261124',shelf()),'REQUEST_ID_123456789'),/VALIDATION/);
 assert.equal(f.writes,0);
});
test('Admin frontend forms escape untrusted data and show MODE SIMULASI status',()=>{
 const window={};
 vm.runInNewContext(read('js/admin-legacy-cms.js'),{window});
 const ui=window.NGD_ADMIN_LEGACY_CMS;
 assert.equal(ui.render({authorized:false,items:[],table:'ai_tools'}),'');
 const rendered=ui.render({authorized:true,enabled:true,table:'ai_tools',
   items:[{tool_id:'ngulik-visual',nama:'<script>alert(1)</script> Foto',
   deskripsi:'Test',prompt_template:'Internal',aktif:false,urut:1,kredit_biaya:1}],
   selectedId:'ngulik-visual'});
 assert.ok(rendered.includes('MODE SIMULASI'));
 assert.ok(rendered.includes('&lt;script&gt;'));
 assert.equal(rendered.includes('<script>alert(1)</script>'),false);
 assert.ok(rendered.includes('name="prompt_template"'));
 assert.ok(rendered.includes('id="admin-legacy-cms-form"'));
 assert.ok(rendered.includes('name="aktif"'));
 const disabled=ui.render({authorized:true,enabled:false,table:'modul_belajar',items:[]});
 assert.ok(disabled.includes('perubahan data belum diaktifkan'));
});

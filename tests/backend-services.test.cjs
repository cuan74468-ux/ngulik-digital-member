'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const services=fs.readFileSync(path.join(root,'apps-script/Services.gs'),'utf8');
const brief=()=>({product_id:'',jenis_layanan:'WEBSITE_CUSTOM',
  judul:'Website untuk toko UMKM',
  brief:'Saya butuh website usaha sederhana dengan katalog produk, formulir dan tombol WhatsApp.',
  referensi_url:'https://example.com/reference',anggaran:1500000});
function setup(){
  const store={service_requests:[],katalog_produk:[{product_id:'P-VIDEO-AI',tipe:'JASA_SEKALI',aktif:true}]};
  const members=[{member_id:'M1',role:'MEMBER',status:'AKTIF'},
    {member_id:'M2',role:'MEMBER',status:'AKTIF'},
    {member_id:'ADMIN',role:'ADMIN',status:'AKTIF'}];
  const events=[];let seq=0,updates=0;
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}}});
  vm.runInContext(code,ctx,{timeout:10000});
  vm.runInContext(services,ctx,{timeout:10000});
  ctx.withLock_=fn=>fn();
  ctx.now_=()=>new Date('2026-11-14T09:00:00Z');
  ctx.isoWib_=d=>new Date(d).toISOString();
  ctx.recordId_=prefix=>prefix+'-'+String(++seq).padStart(12,'0');
  ctx.readAll_=name=>(store[name]||[]).map(x=>({...x}));
  ctx.findRows_=(name,pred)=>ctx.readAll_(name).filter(pred);
  ctx.byId_=(name,field,value)=>ctx.readAll_(name).find(x=>x[field]===value)||null;
  ctx.appendRow_=(name,record)=>{
    if(!store[name])throw Error('MISSING_TABLE '+name);
    store[name].push({...record,_row:store[name].length+2});
  };
  ctx.updateRow_=(name,row,patch)=>{
    const entry=store[name][row-2];if(!entry)throw Error('Missing row');
    Object.assign(entry,patch);updates++;
  };
  ctx.logAudit_=(...args)=>events.push(args);
  ctx.activeMember_=token=>{
    const m=members.find(x=>x.member_id===token);
    if(!m)throw Error('Sesi tidak valid.');return m;
  };
  ctx.admin_=token=>{
    const m=ctx.activeMember_(token);
    if(m.role!=='ADMIN')throw Error('Akses tidak diizinkan.');return m;
  };
  const run=(action,token,p={},requestId='BRIEF_REQUEST_12345678901234')=>
    vm.runInContext('apiRouter_('+[action,token,p,requestId].map(JSON.stringify).join(',')+')',ctx,{timeout:3000});
  return {ctx,store,events,run,get updates(){return updates;}};
}
test('member submits real brief with no payment or ledger mutation',()=>{
  const h=setup(),result=h.run('submitServiceBrief','M1',brief());
  assert.equal(result.item.status,'BARU');
  assert.match(result.item.service_id,/^SRV-[0-9]{12}$/);
  assert.equal(result.item.member_id,undefined);
  assert.equal(result.item.catatan_internal,undefined);
  assert.equal(h.store.service_requests.length,1);
  assert.equal(h.events[0][2],'SERVICE_BRIEF_CREATED');
});
test('same request_id is idempotent; conflicting payload cannot overwrite brief',()=>{
  const h=setup(),id='REQUEST_ID_123456789012345';
  h.run('submitServiceBrief','M1',brief(),id);
  assert.equal(h.run('submitServiceBrief','M1',brief(),id).already_submitted,true);
  assert.throws(()=>h.run('submitServiceBrief','M1',{...brief(),judul:'Judul berbeda'},id),
    /brief berbeda/);
  assert.equal(h.store.service_requests.length,1);
});
test('member only sees their own service briefs; admin sees all',()=>{
  const h=setup();
  h.run('submitServiceBrief','M1',brief(),'REQ_FOR_M1_1234567890');
  h.run('submitServiceBrief','M2',{...brief(),judul:'Toko kedua'},'REQ_FOR_M2_1234567890');
  assert.equal(h.run('getMyServiceRequests','M1').length,1);
  assert.equal(h.run('getMyServiceRequests','M2').length,1);
  assert.equal(h.run('adminListServiceRequests','ADMIN').length,2);
  assert.throws(()=>h.run('adminListServiceRequests','M1'),/Akses tidak diizinkan/);
});
test('service brief does not accept role/status/price injection or invalid references',()=>{
  const h=setup();
  for(const payload of [
    {...brief(),role:'ADMIN'}, {...brief(),status:'PENAWARAN'},
    {...brief(),referensi_url:'javascript:alert(1)'},
    {...brief(),anggaran:-1}, {...brief(),brief:'too short'},
    {...brief(),jenis_layanan:'VIDEO_AI',product_id:''}
  ])assert.throws(()=>h.run('submitServiceBrief','M1',payload),/(tidak|valid|sesuai|minimal|besar|HTTPS|ditolak)/i);
  assert.equal(h.store.service_requests.length,0);
});
test('video AI briefs require a valid active service catalog product',()=>{
  const h=setup();
  const result=h.run('submitServiceBrief','M1',{
    ...brief(),jenis_layanan:'VIDEO_AI',product_id:'P-VIDEO-AI'});
  assert.equal(result.item.product_id,'P-VIDEO-AI');
  h.store.katalog_produk[0].aktif=false;
  assert.throws(()=>h.run('submitServiceBrief','M2',{
    ...brief(),jenis_layanan:'VIDEO_AI',product_id:'P-VIDEO-AI'},'REQ_FOR_M2_1234567890'),
  /belum tersedia/);
});
test('admin quote requires optimistic revision and valid price/message',()=>{
  const h=setup(),r=h.run('submitServiceBrief','M1',brief()).item;
  const original=h.run('adminListServiceRequests','ADMIN')[0];
  const payload={service_id:r.service_id,expected_revision:original.revision,
    status:'PENAWARAN',penawaran_harga:1650000,
    penawaran_pesan:'Paket website responsif dengan katalog produk dan kontak WhatsApp.',
    catatan_internal:'Periksa kebutuhan hosting.'};
  const result=h.run('adminUpdateServiceQuote','ADMIN',payload);
  assert.equal(result.item.status,'PENAWARAN');
  assert.equal(result.item.penawaran_harga,1650000);
  assert.equal(h.run('getMyServiceRequests','M1')[0].catatan_internal,undefined);
  assert.equal(h.run('getMyServiceRequests','M1')[0].penawaran_harga,1650000);
  assert.throws(()=>h.run('adminUpdateServiceQuote','ADMIN',{
    ...payload,status:'DITINJAU'}),/telah diubah admin lain/);
  assert.throws(()=>h.run('adminUpdateServiceQuote','M1',payload),
    /Akses tidak diizinkan/);
});
test('quotations never mark payments as paid or grant credit',()=>{
  const h=setup(),s=h.run('submitServiceBrief','M1',brief()).item;
  const p={service_id:s.service_id,expected_revision:s.revision,
    status:'PENAWARAN',penawaran_harga:500000,penawaran_pesan:'Harga ini hanya merupakan penawaran tertulis.',
    catatan_internal:''};
  h.run('adminUpdateServiceQuote','ADMIN',p);
  assert.equal(Object.keys(h.store).includes('orders'),false);
  assert.equal(Object.keys(h.store).includes('credits_ledger'),false);
  assert.doesNotMatch(services,/\bMailApp\b|\bUrlFetchApp\b|\bGmailApp\b/);
});
test('release gate and table schema exist in source with no public write bypass',()=>{
  assert.match(code,/service_requests: 'service_id,member_id/);
  assert.match(code,/function requireMutationsEnabled_/);
  assert.match(code,/case 'submitServiceBrief':return serviceSubmit_/);
  assert.match(code,/case 'adminUpdateServiceQuote':return serviceQuote_/);
  assert.match(code,/case 'getMyServiceRequests':return serviceListMine_/);
  assert.match(code,/case 'adminListServiceRequests':return serviceListAdmin_/);
});

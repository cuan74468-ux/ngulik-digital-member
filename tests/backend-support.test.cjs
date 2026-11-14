'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const support=fs.readFileSync(path.join(__dirname,'../apps-script/Support.gs'),'utf8');
function harness(){
  const ctx=vm.createContext({console:{log(){},error(){},warn(){}}});
  vm.runInContext(backend,ctx,{timeout:12000});
  vm.runInContext(support,ctx,{timeout:12000});
  const members=[
    {member_id:'M1',role:'MEMBER',status:'AKTIF',nama:'Ari Usaha',
      nama_usaha:'Warung Ari',wa:'6281234560001',status_pos:'AKTIF',
      status_canva:'BELUM',akses_3in1_sampai:''},
    {member_id:'M2',role:'MEMBER',status:'AKTIF',nama:'Dina Toko',
      nama_usaha:'Toko Dina',wa:'6281234560002',status_pos:'BELUM'},
    {member_id:'ADM',role:'ADMIN',status:'AKTIF',nama:'Admin Sistem',wa:'6281234569999'}
  ];
  const products=[
    {product_id:'P-POS',tipe:'LISENSI_SEKALI',nama:'POS Bakso Len',aktif:true},
    {product_id:'P-SEAT',tipe:'SEAT_30H',nama:'Canva Seat',aktif:true},
    {product_id:'P-OTHER',tipe:'LANGGANAN_30H',nama:'3-in-1',aktif:true}
  ];
  const orders=[
    {order_id:'ORDER-1',member_id:'M1',product_id:'P-POS',status:'FULFILLED',
      paid_at:new Date('2026-01-01T00:00:00Z'),created_at:new Date('2025-12-30')},
    {order_id:'ORDER-2',member_id:'M2',product_id:'P-OTHER',status:'PAID',
      paid_at:new Date('2026-01-02T00:00:00Z'),created_at:new Date('2026-01-02')}
  ];
  const store={members,katalog_produk:products,orders,support_tickets:[],
    ticket_activities:[],product_releases:[]};
  let next=0,failUpdate=false;
  const writes=[];
  ctx.readAll_=(table)=>store[table]||[];
  ctx.findRows_=(table,filter)=>(store[table]||[]).filter(filter);
  ctx.byId_=(table,key,value)=>(store[table]||[]).find(x=>String(x[key])===String(value))||null;
  ctx.appendRow_=(table,row)=>{
    if(!store[table])throw Error('TABLE_NOT_FOUND '+table);
    const record={...row,_row:store[table].length+2};
    store[table].push(record);
    writes.push({table,type:'insert',record});
    return record._row;
  };
  ctx.updateRow_=(table,rowNum,patch)=>{
    if(failUpdate){failUpdate=false;throw Error('SIMULATED_FAILURE_AFTER_ACTIVITY');}
    const item=store[table]?.find(x=>x._row===rowNum);
    if(!item)throw Error('ROW_NOT_FOUND '+table);
    Object.assign(item,patch);
    writes.push({table,type:'update',record:patch});
  };
  ctx.withLock_=f=>f();
  ctx.now_=()=>new Date('2026-11-14T00:00:00Z');
  ctx.recordId_=(prefix)=>prefix+'-'+String(++next).padStart(6,'0');
  ctx.isoWib_=d=>new Date(d).toISOString();
  ctx.activeMember_=token=>{
    const m={m1:members[0],m2:members[1],adm:members[2]}[token];
    if(!m)throw Error('Sesi tidak valid.');
    if(m.status!=='AKTIF')throw Error('Akun belum aktif.');
    return m;
  };
  ctx.admin_=token=>{
    const m=ctx.activeMember_(token);
    if(m.role!=='ADMIN')throw Error('Akses tidak diizinkan.');
    return m;
  };
  ctx.creditBalance_=()=>0;
  const run=(action,token,payload={},requestId='REQ-1234567890123456')=>
    vm.runInContext('apiRouter_('+[action,token,payload,requestId].map(x=>JSON.stringify(x)).join(',')+')',
      ctx,{timeout:3000});
  return {ctx,store,members,products,orders,writes,run,failNextUpdate:()=>{failUpdate=true;}};
}
const valid={kategori:'BUG',product_id:'P-POS',judul:'Cetak struk gagal',
  deskripsi:'Aplikasi tidak dapat mencetak struk ketika offline pada Android.',
  platform:'ANDROID',versi_aplikasi:'1.2.0'};
test('Member 360 searches by member, business, WhatsApp and owned product',()=>{
  const h=harness();
  for(const query of ['M1','Warung Ari','6281234560001']){
    const result=h.run('adminSearchMembers','adm',{query});
    assert.equal(result.total,1);
    assert.equal(result.items[0].member_id,'M1');
    assert.equal(Object.hasOwn(result.items[0],'wa'),false);
  }
  const product=h.run('adminSearchMembers','adm',{product_id:'P-POS'});
  assert.equal(product.total,1);
  assert.equal(product.items[0].member_id,'M1');
});
test('Member 360 gives only owned, paid product and customer history',()=>{
  const h=harness();
  const detail=h.run('adminGetMember360','adm',{member_id:'M1'});
  assert.equal(detail.profil.nama,'Ari Usaha');
  assert.equal(detail.produk.length,1);
  assert.equal(detail.produk[0].akses_status,'AKTIF');
  assert.equal(detail.pesanan[0].order_id,'ORDER-1');
  assert.equal(Object.hasOwn(detail.profil,'pin_hash'),false);
});
test('regular member cannot use admin search or Member 360 APIs',()=>{
  const h=harness();
  for(const action of ['adminSearchMembers','adminGetMember360',
      'adminListTickets','adminListProductReleases','adminGetSupportOverview']){
    assert.throws(()=>h.run(action,'m1',{query:'Ari',member_id:'M1'}),/Akses tidak diizinkan/);
  }
});
test('member can create a purchased-product bug report and view own ticket',()=>{
  const h=harness();
  const ticket=h.run('createTicket','m1',valid,'SUPPORT_REQ_12345678');
  assert.equal(ticket.status,'OPEN');
  assert.equal(ticket.order_id,'ORDER-1');
  assert.equal(h.store.support_tickets.length,1);
  assert.equal(h.store.ticket_activities.length,1);
  assert.equal(h.run('getMyTickets','m1').length,1);
  assert.equal(h.run('getTicket','m1',{ticket_id:ticket.ticket_id}).activities.length,1);
  assert.throws(()=>h.run('getTicket','m2',{ticket_id:ticket.ticket_id}),/Tiket tidak ditemukan/);
});
test('product report requires verified purchase and cannot forge an order',()=>{
  const h=harness();
  assert.throws(()=>h.run('createTicket','m2',valid,'SUPPORT_REQ_UNOWNED'),/Belum ada pembelian/);
  assert.throws(()=>h.run('createTicket','m1',{...valid,order_id:'ORDER-2'},
    'SUPPORT_REQ_FORGED'),/Belum ada pembelian/);
  assert.equal(h.store.support_tickets.length,0);
});
test('general question is allowed without product but bug requires product',()=>{
  const h=harness();
  const general={kategori:'PERTANYAAN',judul:'Cara mengganti akun',
    deskripsi:'Bagaimana caranya mengganti data usaha pada profil member?',
    platform:'WEB'};
  assert.equal(h.run('createTicket','m2',general,'SUPPORT_REQ_GENERAL').kategori,'PERTANYAAN');
  assert.throws(()=>h.run('createTicket','m2',{...valid,product_id:''},
    'SUPPORT_REQ_NO_PROD'),/Pilih produk/);
});
test('ticket creation is idempotent and conflicting request id is rejected',()=>{
  const h=harness();
  const first=h.run('createTicket','m1',valid,'SUPPORT_REQ_DUPLICATE');
  const second=h.run('createTicket','m1',valid,'SUPPORT_REQ_DUPLICATE');
  assert.equal(first.ticket_id,second.ticket_id);
  assert.equal(h.store.support_tickets.length,1);
  assert.equal(h.store.ticket_activities.length,1);
  assert.throws(()=>h.run('createTicket','m1',
    {...valid,judul:'Masalah yang berbeda'},'SUPPORT_REQ_DUPLICATE'),
    /ID permintaan/);
});
test('creation retry repairs a missing initial activity',()=>{
  const h=harness();
  const ticket=h.run('createTicket','m1',valid,'SUPPORT_REQ_REPAIR');
  h.store.ticket_activities.length=0;
  h.run('createTicket','m1',valid,'SUPPORT_REQ_REPAIR');
  assert.equal(h.store.support_tickets.length,1);
  assert.equal(h.store.ticket_activities.length,1);
  assert.equal(h.store.ticket_activities[0].ticket_id,ticket.ticket_id);
});
test('member cannot change ticket status, admin can transition with idempotent retry',()=>{
  const h=harness(),ticket=h.run('createTicket','m1',valid,'SUPPORT_REQ_STATUS');
  assert.throws(()=>h.run('adminChangeTicketStatus','m1',
    {ticket_id:ticket.ticket_id,status:'TRIAGE',catatan:'Ditinjau oleh admin'},
    'SUPPORT_REQ_CHANGE'),/Akses tidak diizinkan/);
  const p={ticket_id:ticket.ticket_id,status:'TRIAGE',catatan:'Ditinjau oleh admin'};
  const result=h.run('adminChangeTicketStatus','adm',p,'SUPPORT_REQ_CHANGE');
  assert.equal(result.status,'TRIAGE');
  h.run('adminChangeTicketStatus','adm',p,'SUPPORT_REQ_CHANGE');
  assert.equal(h.store.ticket_activities.length,2);
  assert.throws(()=>h.run('adminChangeTicketStatus','adm',
    {...p,status:'CLOSED'},'SUPPORT_REQ_CHANGE'),/ID permintaan/);
});
test('interrupted status write recovers on identical retry without duplicate activity',()=>{
  const h=harness(),ticket=h.run('createTicket','m1',valid,'SUPPORT_REQ_INTERRUPTED');
  const p={ticket_id:ticket.ticket_id,status:'TRIAGE',catatan:'Perlu pemeriksaan teknis'};
  h.failNextUpdate();
  assert.throws(()=>h.run('adminChangeTicketStatus','adm',p,'SUPPORT_REQ_FIX'),
    /SIMULATED_FAILURE/);
  assert.equal(h.store.support_tickets[0].status,'OPEN');
  assert.equal(h.store.ticket_activities.length,2);
  const retry=h.run('adminChangeTicketStatus','adm',p,'SUPPORT_REQ_FIX');
  assert.equal(retry.status,'TRIAGE');
  assert.equal(h.store.ticket_activities.length,2);
});
test('member replies only to own tickets; closed tickets reject replies',()=>{
  const h=harness(),ticket=h.run('createTicket','m1',valid,'SUPPORT_REQ_REPLIES');
  assert.throws(()=>h.run('replyTicket','m2',
    {ticket_id:ticket.ticket_id,pesan:'Saya coba lagi'},'SUPPORT_REPLY_FOREIGN'),
    /Tiket tidak ditemukan/);
  const result=h.run('replyTicket','m1',
    {ticket_id:ticket.ticket_id,pesan:'Saya coba restart aplikasi.'},'SUPPORT_REPLY_OK');
  assert.equal(result.activities.length,2);
  h.run('adminChangeTicketStatus','adm',
    {ticket_id:ticket.ticket_id,status:'TRIAGE',catatan:'Tiket sedang dicek'},'STATUS_X1_123456789');
  h.run('adminChangeTicketStatus','adm',
    {ticket_id:ticket.ticket_id,status:'IN_PROGRESS',catatan:'Memulai perbaikan'},'STATUS_X2_123456789');
  h.run('adminChangeTicketStatus','adm',
    {ticket_id:ticket.ticket_id,status:'RESOLVED',catatan:'Masalah diperbaiki'},'STATUS_X3_123456789');
  h.run('adminChangeTicketStatus','adm',
    {ticket_id:ticket.ticket_id,status:'CLOSED',catatan:'Konfirmasi selesai'},'STATUS_X4_123456789');
  assert.throws(()=>h.run('replyTicket','m1',
    {ticket_id:ticket.ticket_id,pesan:'Masih bermasalah'},'SUPPORT_REPLY_CLOSED'),
    /Tiket sudah ditutup/);
});
test('release must be drafted and published, and only buyers can see it',()=>{
  const h=harness(),p={product_id:'P-POS',versi:'1.2.1',judul:'Perbaikan cetak struk',
    ringkasan:'Memperbaiki kegagalan cetak pada Android setelah penggunaan offline.',
    tipe_rilis:'PATCH'};
  const d=h.run('adminCreateProductRelease','adm',p,'RELEASE_CREATE_12345678');
  assert.equal(d.status,'DRAFT');
  assert.equal(h.run('getMyProductReleases','m1').length,0);
  assert.equal(h.run('getMyProductReleases','m2').length,0);
  const published=h.run('adminPublishProductRelease','adm',{release_id:d.release_id},
    'RELEASE_PUBLISH_123456');
  assert.equal(published.status,'PUBLISHED');
  assert.equal(h.run('getMyProductReleases','m1').length,1);
  assert.equal(h.run('getMyProductReleases','m2').length,0);
  h.run('adminCreateProductRelease','adm',p,'RELEASE_CREATE_12345678');
  assert.equal(h.store.product_releases.length,1);
  assert.throws(()=>h.run('adminCreateProductRelease','adm',p,'NEW_RELEASE_123456789'),
    /Versi produk ini/);
});

test('limit support spam to five new tickets per member per 24 hours',()=>{
  const h=harness();
  for(let i=1;i<=5;i++)
    h.run('createTicket','m1',{...valid,judul:'Cetak struk gagal '+i},'SUPPORT_DAILY_'+String(i).padStart(16,'0'));
  assert.equal(h.store.support_tickets.length,5);
  assert.throws(()=>h.run('createTicket','m1',
    {...valid,judul:'Cetak struk gagal enam'},'SUPPORT_DAILY_0000000000000006'),
    /Maksimal lima tiket/);
  // A replay must still succeed after the limit is reached.
  const retry=h.run('createTicket','m1',
    {...valid,judul:'Cetak struk gagal 1'},'SUPPORT_DAILY_0000000000000001');
  assert.equal(retry.ticket_id,h.store.support_tickets[0].ticket_id);
});
test('reply retry repairs interrupted reopening without duplicate event',()=>{
  const h=harness(),ticket=h.run('createTicket','m1',valid,'SUPPORT_REOPEN_INITIAL');
  h.store.support_tickets[0].status='RESOLVED';
  const p={ticket_id:ticket.ticket_id,pesan:'Masalah muncul lagi setelah saya mencoba ulang.'};
  h.failNextUpdate();
  assert.throws(()=>h.run('replyTicket','m1',p,'SUPPORT_REPLY_REOPEN'),
    /SIMULATED_FAILURE/);
  assert.equal(h.store.support_tickets[0].status,'RESOLVED');
  assert.equal(h.store.ticket_activities.length,2);
  const outcome=h.run('replyTicket','m1',p,'SUPPORT_REPLY_REOPEN');
  assert.equal(outcome.ticket.status,'OPEN');
  assert.equal(h.store.ticket_activities.length,2);
});
test('support overview flags ticket/event status divergence',()=>{
  const h=harness();
  h.run('createTicket','m1',valid,'SUPPORT_DIVERGENCE');
  h.store.support_tickets[0].status='RESOLVED';
  const overview=h.run('adminGetSupportOverview','adm');
  assert.equal(overview.needs_review,1);
  assert.equal(overview.findings[0].reason,'STATUS_ACTIVITY_DIVERGENCE');
});
test('release duplicate request id refuses changed content',()=>{
  const h=harness(),p={product_id:'P-POS',versi:'1.2.1',judul:'Perbaikan cetak struk',
    ringkasan:'Memperbaiki kegagalan cetak pada Android setelah penggunaan offline.',
    tipe_rilis:'PATCH'};
  h.run('adminCreateProductRelease','adm',p,'RELEASE-REPLAY-000001');
  assert.throws(()=>h.run('adminCreateProductRelease','adm',
    {...p,judul:'Judul yang berbeda'},'RELEASE-REPLAY-000001'),/ID permintaan/);
  assert.equal(h.store.product_releases.length,1);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const catalog=fs.readFileSync(path.join(__dirname,'../apps-script/Catalog.gs'),'utf8');
function boot(){
  const ctx=vm.createContext({console:{log(){},error(){}}});
  vm.runInContext(source,ctx,{timeout:10000});
  vm.runInContext(catalog,ctx,{timeout:10000});
  return ctx;
}
test('all six commercial types can enter checkout',()=>{
  const c=boot();
  assert.deepEqual(Array.from(c.NGD_CHECKOUT_TYPES_).sort(),[
    'JASA_SEKALI','LANGGANAN_30H','LISENSI_SEKALI',
    'PRODUK_DIGITAL','SEAT_30H','TOPUP_KREDIT'
  ].sort());
});
test('product commission override, explicit zero, and global fallback',()=>{
  const c=boot();
  assert.equal(c.commissionRate_({komisi_persen:25},{komisi_persen:10}),10);
  assert.equal(c.commissionRate_({komisi_persen:25},{komisi_persen:0}),0);
  assert.equal(c.commissionRate_({komisi_persen:25},{komisi_persen:''}),25);
  assert.throws(()=>c.commissionRate_({komisi_persen:25},{komisi_persen:51}),
    /Persentase komisi tidak valid/);
});
test('catalog input validates optional product rate without requiring it in legacy forms',()=>{
  const c=boot();
  const p={nama:'Ebook untuk UMKM',deskripsi:'Panduan praktis untuk semua UMKM',
    tipe:'PRODUK_DIGITAL',harga:49000,kredit_diberikan:10,durasi_hari:0,
    perlu_approval_admin:false,bisa_komisi:true,urut:1};
  assert.equal(c.catalogPayload_(p).komisi_persen,'');
  assert.equal(c.catalogPayload_({...p,komisi_persen:12}).komisi_persen,12);
  assert.equal(c.catalogPayload_({...p,komisi_persen:0}).komisi_persen,0);
  assert.throws(()=>c.catalogPayload_({...p,komisi_persen:99}),
    /Komisi produk harus/);
});
function aiFixture(override={}){
  const c=boot(),writes=[],calls=[];
  const entries=[{member_id:'M1',tipe:'GRANT',jumlah:10,
    created_at:new Date('2026-11-16T02:00:00Z')}];
  const p={SOBATAGENT_API_KEY:'KEY1',FALLBACK_AI_API_KEY:'KEY2',
    AI_BASE_URL:'https://api.example.com/v1',
    AI_ENDPOINT_PATH:'chat/completions',AI_MODEL:'model-test',...override};
  c.PropertiesService={getScriptProperties(){
    return {getProperty(k){return p[k]??null;}};
  }};
  c.Utilities={formatDate(date,zone,format){
    return new Date(date).toISOString().slice(0,10);
  }};
  c.now_=()=>new Date('2026-11-16T03:00:00Z');
  c.withLock_=f=>f();
  c.settings_=()=>({ai_max_input_char:1500,ai_daily_limit_per_member:5,
    ai_rate_limit_per_menit:5,ai_base_url:'https://example.com',ai_endpoint_path:'',
    ai_model:''});
  c.byId_=table=>table==='ai_tools'?{tool_id:'T-CAPTION',aktif:true,
    kredit_biaya:2,prompt_template:'Caption {{nama_usaha}} {{input}}'}:null;
  c.readAll_=table=>table==='credits_ledger'?entries:[];
  c.findRows_=(table,pred)=>table==='credits_ledger'?entries.filter(pred):[];
  c.creditBalance_=(id)=>entries.filter(x=>x.member_id===id)
    .reduce((n,x)=>n+Number(x.jumlah||0),0);
  c.appendRow_=(table,row)=>{
    assert.equal(table,'credits_ledger');
    writes.push(row);entries.push({...row,_row:entries.length+2});
  };
  c.recordId_=()=> 'L-'+String(entries.length);
  c.logAudit_=()=>{};
  c.UrlFetchApp={fetch(url,opt){
    calls.push({url,opt});
    return {getResponseCode(){return 200;},getContentText(){
      return JSON.stringify({choices:[{message:{content:'Caption berhasil'}}]});
    }};
  }};
  return {c,entries,writes,calls,props:p,
    member:{member_id:'M1',role:'MEMBER',status:'AKTIF',nama_usaha:'Bakso Len'},
    payload:{tool_id:'T-CAPTION',input:'promosi hari senin'},
    id:'REQ_0000000000000001'};
}
test('AI rejects missing endpoint before any debit',()=>{
  const h=aiFixture({AI_ENDPOINT_PATH:''});
  h.c.settings_=()=>({ai_base_url:'https://api.example.com/v1',
    ai_endpoint_path:'',ai_model:'model-test'});
  assert.throws(()=>h.c.runAiTool_(h.member,h.payload,h.id),/Endpoint/);
  assert.equal(h.writes.length,0);
});
test('successful AI call debits once and renders provider text',()=>{
  const h=aiFixture();
  const out=h.c.runAiTool_(h.member,h.payload,h.id);
  assert.equal(out.hasil,'Caption berhasil');
  assert.equal(h.c.creditBalance_('M1'),8);
  assert.equal(h.entries.filter(x=>x.tipe==='USAGE').length,1);
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].url,'https://api.example.com/v1/chat/completions');
  assert.throws(()=>h.c.runAiTool_(h.member,h.payload,h.id),/sudah diproses/);
  assert.equal(h.calls.length,1);
});
test('provider failure retries fallback key and compensates credits once',()=>{
  const h=aiFixture();
  h.c.UrlFetchApp={fetch(url,opt){
    h.calls.push({url,opt});
    return {getResponseCode(){return 503;},getContentText(){return '{}';}};
  }};
  assert.throws(()=>h.c.runAiTool_(h.member,h.payload,h.id),/Kredit Anda sudah dikembalikan/);
  assert.equal(h.calls.length,2);
  assert.equal(h.c.creditBalance_('M1'),10);
  assert.equal(h.entries.filter(x=>x.tipe==='USAGE').length,1);
  assert.equal(h.entries.filter(x=>x.tipe==='REFUND_ERROR').length,1);
  assert.throws(()=>h.c.runAiTool_(h.member,h.payload,h.id),/sudah diproses/);
  assert.equal(h.entries.filter(x=>x.tipe==='REFUND_ERROR').length,1);
});

test('fresh seed catalog includes nine brief-approved product IDs and per-product rates',()=>{
  const c=boot();
  let seeded;
  c.seedIfEmpty_=(table,rows)=>{assert.equal(table,'katalog_produk');seeded=rows;return rows.length;};
  assert.equal(c.seedCatalog_(),9);
  assert.deepEqual(Array.from(seeded,x=>x.product_id),[
    'P-EBOOK','P-3IN1','P-POS','P-VIDEO-AI','P-CANVA','P-TOKEN-10',
    'P-KREDIT-50','P-KREDIT-150','P-KREDIT-400'
  ]);
  assert.equal(seeded.find(x=>x.product_id==='P-EBOOK').komisi_persen,40);
  assert.equal(seeded.find(x=>x.product_id==='P-VIDEO-AI').komisi_persen,20);
  assert.equal(seeded.find(x=>x.product_id==='P-TOKEN-10').harga,10000);
  assert.ok(seeded.every(x=>x.sumber_produk==='INTERNAL'));
});
test('digital purchase grants bonus once, closes order and repeats commissions per order',()=>{
  const c=boot(),records={credits_ledger:[],affiliate_commissions:[],orders:[],members:[],katalog_produk:[]};
  const member={member_id:'M2',nama:'Test Member',wa:'6281000000000',role:'MEMBER',
    status:'AKTIF',referred_by:'M1'};
  const product={product_id:'P-EBOOK',nama:'Ebook',tipe:'PRODUK_DIGITAL',kredit_diberikan:10,
    bisa_komisi:true,komisi_persen:40};
  const order={order_id:'ORDER-A',member_id:'M2',product_id:'P-EBOOK',
    harga_dasar:25000,total_bayar:25100,status:'PAID',_row:2};
  records.members.push(member);
  records.katalog_produk.push(product);
  records.orders.push(order);
  let n=0,notifications=0;
  c.byId_=(table,key,val)=>(records[table]||[]).find(x=>String(x[key])===String(val))||null;
  c.findRows_=(table,pred)=>(records[table]||[]).filter(pred);
  c.appendRow_=(table,x)=>{records[table].push({...x,_row:records[table].length+2});};
  c.updateRow_=(table,row,patch)=>Object.assign(records[table][row-2],patch);
  c.creditBalance_=id=>records.credits_ledger.filter(x=>x.member_id===id)
    .reduce((sum,x)=>sum+Number(x.jumlah),0);
  c.settings_=()=>({komisi_persen:25,komisi_hanya_order_pertama:false,
    masa_tahan_hari:14});
  c.now_=()=>new Date('2026-11-16T05:00:00Z');
  c.recordId_=()=>String(++n);
  c.logAudit_=()=>{};
  c.notifyPaidOrder_=()=>{notifications++};
  const actor={role:'ADMIN',member_id:'M-0001'};
  c.onPaid_(order,actor);
  c.onPaid_(order,actor);
  assert.equal(records.credits_ledger.length,1);
  assert.equal(records.credits_ledger[0].tipe,'DIGITAL_BONUS');
  assert.equal(c.creditBalance_('M2'),10);
  assert.equal(order.status,'FULFILLED');
  assert.equal(records.affiliate_commissions.length,1);
  assert.equal(records.affiliate_commissions[0].nominal,10000);
  assert.equal(notifications,2);
});
test('Fonnte uses raw Authorization token, persists accepted message and skips duplicate',()=>{
  const c=boot(),records=[],calls=[];
  c.normalizeWa_=wa=>wa;
  c.findRows_=(table,pred)=>{
    assert.equal(table,'wa_notifications');return records.filter(pred);
  };
  c.appendRow_=(table,row)=>{
    assert.equal(table,'wa_notifications');records.push({...row,_row:records.length+2});
  };
  c.updateRow_=(table,row,patch)=>Object.assign(records[row-2],patch);
  c.recordId_=()=> 'WA-0001';
  c.now_=()=>new Date('2026-11-16T06:00:00Z');
  c.PropertiesService={getScriptProperties(){return{
    getProperty:k=>k==='FONNTE_API_TOKEN'?'TEST_FONNTE_TOKEN':null
  };}};
  c.UrlFetchApp={fetch(url,opt){calls.push({url,opt});
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({status:true,id:[123]})};
  }};
  const first=c.sendFonnteWa_('6281000000000','Pesanan dibayar','MEMBER','ORDER_PAID_MEMBER','ORDER-A');
  const second=c.sendFonnteWa_('6281000000000','Pesanan dibayar','MEMBER','ORDER_PAID_MEMBER','ORDER-A');
  assert.equal(first.status,'ACCEPTED');
  assert.equal(second.already_sent,true);
  assert.equal(records.length,1);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.fonnte.com/send');
  assert.equal(calls[0].opt.headers.Authorization,'TEST_FONNTE_TOKEN');
});

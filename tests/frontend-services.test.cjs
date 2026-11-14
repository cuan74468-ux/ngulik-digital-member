'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const renderSource=fs.readFileSync(path.join(root,'js/services-ui.js'),'utf8');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/unified-theme.css'),'utf8');
function fixture(){
  const context=vm.createContext({window:{}});
  vm.runInContext(renderSource,context,{timeout:10000});
  return context.window.NGD_SERVICES_UI;
}
test('member must log in before creating a real service request',()=>{
  const ui=fixture();
  const html=ui.member({logged:false,items:[],enabled:false});
  assert.match(html,/Masuk ke akun/);
  assert.doesNotMatch(html,/id="service-brief-form"/);
});
test('service briefing uses real fields and remains off without backend approval',()=>{
  const ui=fixture();
  const html=ui.member({logged:true,kind:'VIDEO_AI',items:[],enabled:false});
  for(const name of ['jenis_layanan','judul','brief','referensi_url','anggaran'])
    assert.match(html,new RegExp('name="'+name+'"'));
  assert.match(html,/name="jenis_layanan"/);
  assert.match(html,/Kirim brief untuk ditinjau/);
  assert.match(html,/LINGGAU AI STUDIO/);
  assert.match(html,/disabled/);
  assert.doesNotMatch(html,/Rp0<\/strong>/);
});
test('member view masks internal notes and safely escapes user-supplied content',()=>{
  const ui=fixture();
  const out=ui.member({logged:true,kind:'VIDEO_AI',items:[{
    service_id:'SRV-X',judul:'<img src=x onerror=alert(1)>',
    jenis_layanan:'VIDEO_AI',status:'PENAWARAN',
    penawaran_harga:50000,penawaran_pesan:'<script>alert(2)</script>',
    catatan_internal:'PRIVATE INTERNAL ONLY'
  }],enabled:true});
  assert.match(out,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(out,/&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(out,/<img src=/);
  assert.doesNotMatch(out,/PRIVATE INTERNAL ONLY/);
  assert.match(out,/Penawaran tersedia/);
});
test('admin screen is role-isolated and quote form never claims payment',()=>{
  const ui=fixture();
  assert.doesNotMatch(ui.admin({authorized:false,items:[],enabled:true}),/id="service-quote-form"/);
  const example={service_id:'SRV-123456789012',member_id:'M1',jenis_layanan:'VIDEO_AI',
    judul:'Video promosi produk',brief:'Kebutuhan video promosi produk untuk toko',
    status:'BARU',penawaran_harga:0,anggaran:50000,revision:1};
  const html=ui.admin({authorized:true,items:[example],enabled:false});
  assert.match(html,/id="service-quote-form"/);
  assert.match(html,/name="penawaran_harga"/);
  assert.match(html,/name="catatan_internal"/);
  assert.match(html,/disabled/);
  assert.match(html,/tidak menerima uang/);
  assert.doesNotMatch(html,/checkout otomatis|saldo bertambah/i);
});
test('commercial service module is loaded on all member/admin routes',()=>{
  assert.match(html,/src="\.\/js\/services-ui\.js/);
  assert.match(app,/function viewServiceRequests\(\)/);
  assert.match(app,/function viewAdminServices\(\)/);
  assert.match(app,/submitServiceBrief\(/);
  assert.match(app,/api\('submitServiceBrief'/);
  assert.match(app,/api\('adminUpdateServiceQuote'/);
  assert.match(app,/data-service-go/);
  assert.match(config,/serviceEnabled: false/);
  assert.match(css,/\.service-columns/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.service-columns/);
});

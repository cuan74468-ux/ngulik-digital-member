'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),
fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const gas=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const html=[fs.readFileSync(path.join(root,'index.html'),'utf8'),fs.readFileSync(path.join(root,'staging/member.html'),'utf8')];
const between=(text,a,b)=>{const s=text.indexOf(a),e=text.indexOf(b,s);assert.ok(s>=0&&e>s,'missing '+a);return text.slice(s,e)};
const attribution=between(app,"const firstInviterKey=","// Production catalogue");
const redirect=between(app,"// Called synchronously during initial script evaluation","async function init(){");
const urls=between(app,"const NGD_FREE_EBOOK_URL=","function viewHeroFreeLinks_");
function browser(query,{blocked=false,initial=null}={}){
  const cells=new Map(initial||[]);
  const events=[];
  let currentQuery=query,clock=Date.UTC(2026,10,20);
  const localStorage={
    getItem(k){if(blocked)throw Error('storage denied');return cells.get(k)||null;},
    setItem(k,v){if(blocked)throw Error('storage denied');cells.set(k,v);events.push('persist');},
    removeItem(k){if(blocked)throw Error('storage denied');cells.delete(k)}
  };
  const window={location:{assign(url){
    assert.ok(cells.has('ngd_first_inviter_v1'),'redirect before persistence');
    events.push('redirect');
    events.push(url);
  }}};
  const context=vm.createContext({localStorage,window,location:{get search(){return currentQuery;}},
    URLSearchParams,Date:{now:()=>clock},Number,String,JSON});
  vm.runInContext(attribution+'\n'+urls+'\n'+redirect,context,{timeout:2000});
  return {run:()=>vm.runInContext('routeFreeDoor_()',context),
    first:()=>vm.runInContext('firstInviter_()',context),
    query:q=>{currentQuery=q;},time:n=>{clock+=n;},cells,events};
}
test('ebook landing persists inviter before opening original free ebook',()=>{
  const b=browser('?ref=KODE_A&free=ebook');
  assert.equal(b.run(),true);
  assert.deepEqual(b.events.slice(0,2),['persist','redirect']);
  assert.equal(b.events[2],'https://cuan74468-ux.github.io/buku-pintar-vibe-coder/');
  assert.equal(b.first(),'KODE_A');
});
test('classroom landing persists inviter before Google Classroom launch',()=>{
  const b=browser('?ref=KODE_B&free=kelas');
  assert.equal(b.run(),true);
  assert.deepEqual(b.events.slice(0,2),['persist','redirect']);
  assert.match(b.events[2],/^https:\/\/classroom\.google\.com\/c\/ODk4MzQ4OTEwMjc5\?cjc=ozzbygx3$/);
});
test('first valid inviter wins for 30 days; expires and can be replaced',()=>{
  const b=browser('?ref=FIRST_A&free=ebook');
  assert.equal(b.run(),true);
  b.query('?ref=SECOND_B&free=kelas');b.time(29*86400000);
  assert.equal(b.run(),true);assert.equal(b.first(),'FIRST_A');
  b.time(86400001);assert.equal(b.first(),'');
  assert.equal(b.run(),true);assert.equal(b.first(),'SECOND_B');
});
test('browser storage denied: never redirect and never claim attribution',()=>{
  const b=browser('?ref=VALID_ABC&free=kelas',{blocked:true});
  assert.equal(b.run(),false);assert.deepEqual(b.events,[]);
});
test('invalid ref cannot redirect, and a plain ref does not auto-navigate',()=>{
  const b=browser('?ref=<script>&free=ebook');
  assert.equal(b.run(),false);assert.deepEqual(b.events,[]);
  b.query('?ref=ABCDEF');assert.equal(b.run(),false);
});
test('entrypoint performs redirect before any awaited public/session load',()=>{
  assert.match(app,/async function init\(\)\{\s*if\(routeFreeDoor_\(\)\)return;\s*captureFirstInviter_\(\)/);
  assert.match(app,/\?ref='\+encodeURIComponent\(code\)/);
  assert.match(app,/const ebookInvite=url\?url\+'&free=ebook'/);
  assert.match(app,/const classInvite=url\?url\+'&free=kelas'/);
});
test('member/public copies avoid technical commission terminology',()=>{
  const view=between(app,'function viewAffiliate(){','function viewNotificationCenter(){');
  const publicCopy=view.replace(/data-[a-z-]+/g,'').replace(/class="[^"]*"/g,'');
  // Allow internal function keys, CSS names and backend contract identifiers.
  for(const s of ['PROGRAM AFFILIATE','TAUTAN REFERRAL','Komisi referral','Pendaftar dari referral'])
    assert.doesNotMatch(publicCopy,new RegExp(s,'i'));
  assert.match(app,/function uiCommissionText_\(value\)/);
  assert.match(app,/uiCommissionText_\(state\.info\?\.disclosure/);
  for(const page of html) assert.doesNotMatch(page,/>\s*(?:Affiliate|Afiliator|Referral|Payout|Tier)\s*</i);
});
test('member dashboard strips DANA destination and transfer evidence',()=>{
  const section=between(gas,'function affiliateDashboard_(m) {','function ngdDanaDestination_');
  assert.match(section,/komisi:safeRows/);
  const safeMap=between(section,'var safeRows=all.map','var partnerUnlocked=ngdStarterUnlocked_');
  assert.doesNotMatch(safeMap,/payout_note|nomor_dana/);
});
test('admin payout only after proof and exact DANA match; reference not reused',()=>{
  const section=between(gas,"case 'adminMarkCommissionPaid':","throw ngdError_('BAD_REQUEST','Aksi tidak dikenal.')");
  assert.match(section,/p\.dana_sudah_ditransfer===true&&p\.penerima_terverifikasi===true/);
  assert.match(section,/ngdDanaDestination_\(p\.nomor_dana\)===destination\.split/);
  assert.match(section,/require_\(reference\.length>=5/);
  assert.match(section,/require_\(note\.length>=5/);
  assert.match(section,/referenceUsed\.length===0/);
  assert.match(section,/status:'PAID',paid_at:now_\(\)/);
});
test('QRIS path configured but unverified image must keep payment gate closed',()=>{
  const config=fs.readFileSync(path.join(root,'config.js'),'utf8');
  const stage=fs.readFileSync(path.join(root,'staging/member-config.js'),'utf8');
  for(const c of [config,stage]){
    assert.match(c,/qris-linggau-ai-studio\.svg/);
    assert.match(c,/qrisOwnerImageApproved:\s*false/);
  }
  assert.match(app,/api\('createOrder',\{product_id:productId\}/);
  assert.doesNotMatch(app,/api\('createMayarOrder'/);
  assert.match(app,/const canConfirm=open&&paymentEnabled\(\)&&!financeBlocked&&officialQr/);
});

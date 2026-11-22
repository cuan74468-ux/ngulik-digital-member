'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),
fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const gas=fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8');
const html=[fs.readFileSync(path.join(root,'index.html'),'utf8'),fs.readFileSync(path.join(root,'staging/member.html'),'utf8')];
const between=(text,a,b)=>{const s=text.indexOf(a),e=text.indexOf(b,s);assert.ok(s>=0&&e>s,'missing '+a);return text.slice(s,e)};
const attribution=between(app,"const firstInviterKey=","// Production catalogue");
// Free materials are now member-only. Attribution remains on public registration
// visits, but no query parameter may redirect a guest to eBook/Classroom.
const urls=between(app,"const NGD_FREE_EBOOK_URL=","function viewMemberFreeResources_");
function browser(query,{blocked=false,initial=null}={}){
  const cells=new Map(initial||[]),events=[];
  let currentQuery=query,clock=Date.UTC(2026,10,20);
  const localStorage={
    getItem(k){if(blocked)throw Error('storage denied');return cells.get(k)||null;},
    setItem(k,v){if(blocked)throw Error('storage denied');cells.set(k,v);events.push('persist');},
    removeItem(k){if(blocked)throw Error('storage denied');cells.delete(k)}
  };
  const context=vm.createContext({localStorage,location:{get search(){return currentQuery;}},
    URLSearchParams,Date:{now:()=>clock},Number,String,JSON});
  vm.runInContext(attribution,context,{timeout:2000});
  return {capture:()=>vm.runInContext('captureFirstInviter_()',context),
    first:()=>vm.runInContext('firstInviter_()',context),
    query:q=>{currentQuery=q;},time:n=>{clock+=n;},cells,events};
}
test('public invite persists attribution without redirecting to free materials',()=>{
  const b=browser('?ref=KODE_A&free=ebook');
  assert.equal(b.capture(),'KODE_A');
  assert.deepEqual(b.events,['persist']);
  assert.equal(b.first(),'KODE_A');
  assert.doesNotMatch(app,/routeFreeDoor_\(|window\.location\.assign\(target\)/);
});
test('first valid inviter wins for 30 days and expires safely',()=>{
  const b=browser('?ref=FIRST_A&free=ebook');
  assert.equal(b.capture(),'FIRST_A');
  b.query('?ref=SECOND_B&free=kelas');b.time(29*86400000);
  assert.equal(b.capture(),'FIRST_A');
  b.time(86400001);assert.equal(b.first(),'');
  assert.equal(b.capture(),'SECOND_B');
});
test('browser storage denied never claims attribution or redirects',()=>{
  const b=browser('?ref=VALID_ABC&free=kelas',{blocked:true});
  assert.equal(b.capture(),'');assert.deepEqual(b.events,[]);
});
test('invalid referral code is rejected; plain referral does not navigate',()=>{
  const b=browser('?ref=<script>&free=ebook');
  assert.equal(b.capture(),'');assert.deepEqual(b.events,[]);
  b.query('?ref=ABCDEF');assert.equal(b.capture(),'ABCDEF');
  assert.deepEqual(b.events,['persist']);
});
test('entrypoint captures referrals but never opens free doors before login',()=>{
  assert.match(app,/async function init\(\)\{\s*captureFirstInviter_\(\)/);
  assert.match(app,/\?ref='\+encodeURIComponent\(code\)/);
  assert.doesNotMatch(app,/const ebookInvite=|const classInvite=|routeFreeDoor_\(/);
  assert.match(app,/function viewMemberFreeResources_\(\)/);
  assert.match(app,/if\(!logged\(\)\|\|isAdmin\(\)\)return ''/);
  assert.match(urls,/https:\/\/cuan74468-ux\.github\.io\/buku-pintar-vibe-coder\//);
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
  for(const c of [config,stage])assert.match(c,/qris-linggau-ai-studio\.svg/);
  assert.match(config,/qrisOwnerImageApproved:\s*false/);
  assert.match(stage,/qrisOwnerImageApproved:\s*true/);
  assert.match(app,/api\('createOrder',\{product_id:productId\}/);
  assert.doesNotMatch(app,/api\('createMayarOrder'/);
  assert.match(app,/const canConfirm=open&&paymentEnabled\(\)&&!financeBlocked&&officialQr/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const backend=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
const payload=()=>({nama:'Peserta Baru',nama_usaha:'Bakso Digital',jenis_usaha:'F&B',
  kota:'Lubuklinggau',deskripsi_usaha:'Warung makanan',instagram:'@bakso.digital'});
function fixture(){
  const row={_row:2,member_id:'M1',role:'MEMBER',status:'AKTIF',
    nama:'Peserta',nama_usaha:'Warung Awal',jenis_usaha:'',kota:'',deskripsi_usaha:'',instagram:'',
    wa:'6281212345678',pin_hash:'SECRET',saldo_kredit:100};
  const audit=[];let writes=0;
  const ctx=vm.createContext({console:{log(){},error(){}}});
  vm.runInContext(backend,ctx,{timeout:10000});
  ctx.withLock_=(fn)=>fn();
  ctx.byId_=(table,field,id)=>table==='members'&&field==='member_id'&&id==='M1'?{...row}:null;
  ctx.updateRow_=(table,line,patch)=>{
    assert.equal(table,'members');assert.equal(line,2);
    Object.assign(row,patch);writes++;
  };
  ctx.logAudit_=(...args)=>audit.push(args);
  ctx.publicMember_=(m)=>({...m});
  return {ctx,row,audit,get writes(){return writes;}};
}
test('member may edit only their own public business profile fields',()=>{
  const x=fixture();
  const result=x.ctx.updateMyProfile_({member_id:'M1',role:'MEMBER'},payload());
  assert.equal(result.updated,true);
  assert.equal(result.profil.nama,'Peserta Baru');
  assert.equal(x.row.wa,'6281212345678');
  assert.equal(x.row.pin_hash,'SECRET');
  assert.equal(x.row.saldo_kredit,100);
  assert.equal(x.writes,1);
  assert.equal(x.audit.length,1);
  assert.equal(x.audit[0][2],'PROFILE_UPDATED');
  assert.equal(JSON.stringify(x.audit).includes('Warung Awal'),false);
});
test('replaying identical profile update is idempotent',()=>{
  const x=fixture(),m={member_id:'M1',role:'MEMBER'};
  x.ctx.updateMyProfile_(m,payload());
  const again=x.ctx.updateMyProfile_(m,payload());
  assert.equal(again.updated,false);
  assert.equal(x.writes,1);
  assert.equal(x.audit.length,1);
});
test('attempted role, phone, credit or status changes are rejected without writes',()=>{
  const x=fixture(),member={member_id:'M1',role:'MEMBER'};
  for(const changed of [{role:'ADMIN'},{wa:'6281999999999'},{saldo_kredit:500000},{status:'AKTIF'}]){
    assert.throws(()=>x.ctx.updateMyProfile_(member,{...payload(),...changed}),/Kolom profil tidak diizinkan/);
  }
  assert.equal(x.writes,0);
});
test('incomplete and invalid input cannot partly update member profile',()=>{
  const x=fixture(),member={member_id:'M1',role:'MEMBER'};
  assert.throws(()=>x.ctx.updateMyProfile_(member,{nama:'Only Name'}),/belum lengkap/);
  assert.throws(()=>x.ctx.updateMyProfile_(member,{...payload(),nama:'A'}),/minimal dua karakter/);
  assert.throws(()=>x.ctx.updateMyProfile_(member,{...payload(),kota:'x'.repeat(81)}),/Teks terlalu panjang/);
  assert.equal(x.writes,0);
});
test('suspended account and admin self-edit are forbidden',()=>{
  const x=fixture();
  assert.throws(()=>x.ctx.updateMyProfile_({member_id:'M1',role:'ADMIN'},payload()),/Hanya member/);
  x.row.status='SUSPENDED';
  assert.throws(()=>x.ctx.updateMyProfile_({member_id:'M1',role:'MEMBER'},payload()),/Akun tidak dapat/);
  assert.equal(x.writes,0);
});
test('browser submits only whitelisted fields and respects the public demo gate',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  assert.match(app,/id="profile-form"/);
  assert.match(app,/function viewProfileEditor/);
  assert.match(app,/if\(!logged\(\)\|\|isAdmin\(\)\|\|!isWriteEnabled\(\)\)/);
  assert.match(backend,/case 'updateMyProfile':return updateMyProfile_/);
});

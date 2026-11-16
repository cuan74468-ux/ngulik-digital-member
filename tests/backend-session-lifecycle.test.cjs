'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../apps-script/Code.gs'),'utf8');

function fixture(){
  let inLock=false,locks=0,deletions=[],updates=[],audits=[];
  const member={
    _row:3,member_id:'M-01',role:'MEMBER',status:'AKTIF',
    pin_salt:'OLD_SALT',pin_hash:'hash-OLD_SALT-285947',wa:'6281234000000'
  };
  const admin={_row:2,member_id:'ADMIN',role:'ADMIN',status:'AKTIF',wa:'6281234000001'};
  const valid='A'.repeat(64),other='B'.repeat(64);
  const sessions=[
    {_row:2,token_hash:'hash-'+valid,member_id:'M-01',role:'MEMBER',
      expires_at:new Date(Date.now()+3600000)},
    {_row:3,token_hash:'hash-'+other,member_id:'ADMIN',role:'ADMIN',
      expires_at:new Date(Date.now()+3600000)},
    {_row:4,token_hash:'hash-'+valid,member_id:'M-01',role:'MEMBER',
      expires_at:new Date(Date.now()+3600000)}
  ];
  const ctx=vm.createContext({console:{log(){},warn(){},error(){}}});
  vm.runInContext(code,ctx,{timeout:10000});
  ctx.sha256_=x=>'hash-'+String(x);
  ctx.pinHash_=(pin,salt)=>'hash-'+salt+'-'+pin;
  ctx.newSalt_=()=> 'NEW_SALT';
  ctx.checkNewPin_=()=>{};
  ctx.now_=()=>new Date('2026-11-16T00:00:00Z');
  ctx.withLock_=fn=>{
    assert.equal(inLock,false,'nested lock is not allowed');
    inLock=true;locks++;
    try{return fn();}finally{inLock=false;}
  };
  ctx.findRows_=(name,predicate)=>{
    const data=name==='sessions'?sessions:name==='members'?[admin,member]:[];
    return data.filter(predicate);
  };
  ctx.byId_=(name,key,id)=>name==='members'&&key==='member_id'&&id===member.member_id?member:null;
  ctx.updateRow_=(name,row,patch)=>{
    assert.equal(inLock,true);
    assert.equal(name,'members');assert.equal(row,3);
    Object.assign(member,patch);updates.push({name,row,patch});
  };
  ctx.tbl_=name=>{
    assert.equal(name,'sessions');
    return {sheet:{deleteRow(row){
      assert.equal(inLock,true,'all physical deletes must be locked');
      assert.ok(row>=2);
      const i=row-2;
      assert.ok(sessions[i]&&sessions[i]._row===row);
      deletions.push({row,member_id:sessions[i].member_id});
      sessions.splice(i,1);
      sessions.forEach((s,j)=>s._row=j+2);
    }}};
  };
  ctx.logAudit_=(...args)=>audits.push(args);
  return {ctx,member,admin,valid,other,sessions,
    locks:()=>locks,deletions,updates,audits};
}

test('logout removes matching token rows bottom-up under the shared lock',()=>{
  const h=fixture();
  const result=h.ctx.authLogout_(h.valid);
  assert.equal(result.success,true);
  assert.deepEqual(h.deletions.map(x=>x.row),[4,2]);
  assert.ok(h.deletions.every(x=>x.member_id==='M-01'));
  assert.equal(h.sessions.length,1);
  assert.equal(h.sessions[0].member_id,'ADMIN');
  assert.equal(h.locks(),1);
});
test('logout retry is idempotent; unrelated admin session persists',()=>{
  const h=fixture();
  h.ctx.authLogout_(h.valid);
  assert.equal(h.ctx.authLogout_(h.valid).success,true);
  assert.equal(h.deletions.length,2);
  assert.equal(h.sessions.length,1);
  assert.equal(h.locks(),2);
});
test('session lookup rejects revoked token, expired token and suspended member',()=>{
  const h=fixture();
  // Remove the deliberately duplicated hash from the fixture: unique
  // session IDs are now a hard requirement before authorization.
  h.sessions.splice(2,1);
  assert.equal(h.ctx.session_(h.valid).member_id,'M-01');
  h.ctx.authLogout_(h.valid);
  assert.throws(()=>h.ctx.session_(h.valid),/berakhir/);
  assert.equal(h.ctx.session_(h.other).member_id,'ADMIN');
  h.sessions[0].expires_at=new Date(Date.now()-60000);
  assert.throws(()=>h.ctx.session_(h.other),/berakhir/);
  h.sessions[0].expires_at=new Date(Date.now()+60000);
  h.admin.status='SUSPENDED';
  assert.throws(()=>h.ctx.session_(h.other),/tidak aktif/);
});
test('PIN change revokes only actor sessions and preserves unrelated admin session',()=>{
  const h=fixture();
  const response=h.ctx.authChangePin_(h.member,{pin_lama:'285947',pin_baru:'492753'});
  assert.equal(response.login_required,true);
  assert.equal(h.member.pin_salt,'NEW_SALT');
  assert.equal(h.member.pin_hash,'hash-NEW_SALT-492753');
  assert.equal(h.locks(),1);
  assert.equal(h.sessions.length,1);
  assert.equal(h.sessions[0].member_id,'ADMIN');
  assert.deepEqual(h.deletions.map(x=>x.row),[4,2]);
  assert.equal(h.updates.length,1);
  assert.equal(h.audits.length,1);
  assert.equal(JSON.stringify(h.audits).includes('492753'),false);
});
test('incorrect old PIN does not update member or revoke sessions',()=>{
  const h=fixture();
  assert.throws(()=>h.ctx.authChangePin_(h.member,
    {pin_lama:'111111',pin_baru:'492753'}),/PIN lama salah/);
  assert.equal(h.updates.length,0);
  assert.equal(h.deletions.length,0);
  assert.equal(h.sessions.length,3);
});

test('duplicate token hash fails closed and does not return the first session',()=>{
  const h=fixture();
  assert.throws(()=>h.ctx.session_(h.valid),/Sesi berakhir/);
  assert.equal(h.sessions.length,3);
  assert.equal(h.locks(),0);
});
test('session with missing or malformed expiry cannot remain active indefinitely',()=>{
  const h=fixture();
  h.sessions[1].expires_at='';
  assert.throws(()=>h.ctx.session_(h.other),/Sesi berakhir/);
  h.sessions[1].expires_at='not-a-date';
  assert.throws(()=>h.ctx.session_(h.other),/Sesi berakhir/);
  h.sessions[1].expires_at=null;
  assert.throws(()=>h.ctx.session_(h.other),/Sesi berakhir/);
});
test('existing sessions cannot silently inherit an ADMIN role after role change',()=>{
  const h=fixture();
  h.sessions.splice(2,1);
  h.member.role='ADMIN';
  assert.throws(()=>h.ctx.session_(h.valid),/Akun tidak aktif/);
  assert.equal(h.sessions.length,2);
});
test('a role mismatch or missing session role invalidates the token',()=>{
  const h=fixture();
  h.sessions[1].role='MEMBER';
  assert.throws(()=>h.ctx.session_(h.other),/Akun tidak aktif/);
  h.sessions[1].role='';
  assert.throws(()=>h.ctx.session_(h.other),/Akun tidak aktif/);
});
test('duplicate member identifiers invalidate a valid-looking session',()=>{
  const h=fixture();
  const native=h.ctx.findRows_;
  h.ctx.findRows_=(name,predicate)=>{
    const result=native(name,predicate);
    return name==='members'&&result.length?[...result,result[0]]:result;
  };
  assert.throws(()=>h.ctx.session_(h.other),/Akun tidak aktif/);
});

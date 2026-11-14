'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=read('apps-script/Code.gs'),notifications=read('apps-script/Notifications.gs');
function fixture(flags={}){
  const rows={
    members:[{_row:2,member_id:'M1',role:'MEMBER'},{_row:3,member_id:'M2',role:'MEMBER'}],
    notifications:[{_row:2,notification_id:'NTF-AAAAAAAAAAAA',member_id:'M1',
      source:'SUPPORT',source_id:'TA-111111111111',jenis:'STATUS',judul:'Tiket diperbarui',
      pesan:'Informasi tiket',status:'UNREAD',created_at:'2026-11-14T02:00:00Z',
      read_at:'',request_id:'x'},
      {_row:3,notification_id:'NTF-BBBBBBBBBBBB',member_id:'M2',
       source:'SUPPORT',source_id:'TA-222222222222',jenis:'BALASAN',judul:'Privat',
       pesan:'Rahasia milik M2',status:'UNREAD',created_at:'2026-11-14T02:00:00Z'}],
    support_tickets:[{ticket_id:'SUP-ABC',member_id:'M1'}],
    ticket_activities:[
      {activity_id:'TA-111111111111',ticket_id:'SUP-ABC',actor_role:'ADMIN',jenis:'STATUS',ke_status:'TRIAGE'},
      {activity_id:'TA-333333333333',ticket_id:'SUP-ABC',actor_role:'ADMIN',jenis:'BALASAN'},
      {activity_id:'TA-444444444444',ticket_id:'SUP-ABC',actor_role:'MEMBER',jenis:'BALASAN'}
    ]
  };
  let reads=0,writes=0,sequence=0;
  const ctx=vm.createContext({
    console:{log(){},error(){}},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return flags[k]||null;}}}}
  });
  vm.runInContext(core,ctx,{timeout:10000});
  vm.runInContext(notifications,ctx,{timeout:10000});
  ctx.readAll_=(name)=>{reads++;return (rows[name]||[]).map(r=>({...r}));};
  ctx.findRows_=(name,predicate)=>ctx.readAll_(name).filter(predicate);
  ctx.byId_=(name,col,val)=>ctx.findRows_(name,r=>String(r[col])===String(val))[0]||null;
  ctx.withLock_=(fn)=>fn();
  ctx.now_=()=>new Date('2026-11-14T03:30:00Z');
  ctx.recordId_=(prefix)=>prefix+'-'+String(++sequence).padStart(12,'0');
  ctx.appendRow_=(name,record)=>{writes++;rows[name].push({...record,_row:rows[name].length+2});};
  ctx.updateRow_=(name,row,patch)=>{writes++;Object.assign(rows[name][row-2],patch);};
  return {ctx,rows,get reads(){return reads;},get writes(){return writes;}};
}
test('inbox is fail-closed and does not read a table when feature flag is OFF',()=>{
  const x=fixture();
  const result=x.ctx.notificationInbox_({member_id:'M1'});
  assert.equal(result.enabled,false);
  assert.deepEqual(Array.from(result.items),[]);
  assert.equal(x.reads,0);
  assert.equal(x.writes,0);
});
test('member only sees their own notifications, without internal IDs or request keys',()=>{
  const x=fixture({NGD_NOTIFICATIONS_ENABLED:'true'});
  const result=x.ctx.notificationInbox_({member_id:'M1'});
  assert.equal(result.enabled,true);
  assert.equal(result.unread,1);
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].judul,'Tiket diperbarui');
  assert.equal('member_id' in result.items[0],false);
  assert.equal('request_id' in result.items[0],false);
  assert.equal(JSON.stringify(result).includes('Rahasia milik M2'),false);
});
test('mark-read rejects foreign notifications and accepts idempotent replay',()=>{
  const x=fixture({NGD_NOTIFICATIONS_ENABLED:'true'});
  const m={member_id:'M1'};
  assert.throws(()=>x.ctx.notificationMarkRead_(m,{notification_id:'NTF-BBBBBBBBBBBB'}),/Notifikasi tidak ditemukan/);
  const own={notification_id:'NTF-AAAAAAAAAAAA'};
  assert.equal(x.ctx.notificationMarkRead_(m,own).already_read,false);
  assert.equal(x.ctx.notificationMarkRead_(m,own).already_read,true);
  assert.equal(x.rows.notifications[0].status,'READ');
  assert.equal(x.writes,1);
});
test('support materializer is disabled without both server-side switches',()=>{
  const x=fixture({NGD_NOTIFICATIONS_ENABLED:'true'});
  assert.throws(()=>x.ctx.buildSupportNotifications(),/Sistem masih dalam pengujian/);
  assert.equal(x.writes,0);
});
test('materializer is idempotent, ignores member replies, and stores no private reply text',()=>{
  const x=fixture({NGD_NOTIFICATIONS_ENABLED:'true',NGD_MUTATIONS_ENABLED:'true'});
  const first=x.ctx.buildSupportNotifications();
  assert.equal(first.created,1);
  assert.equal(x.rows.notifications.length,3);
  assert.equal(x.rows.notifications[2].source_id,'TA-333333333333');
  assert.equal(x.rows.notifications[2].member_id,'M1');
  assert.equal(x.rows.notifications[2].pesan.includes('balasan'),true);
  const second=x.ctx.buildSupportNotifications();
  assert.equal(second.created,0);
  assert.equal(x.writes,1);
});
test('backend schema and routing require a separate opt-in feature gate',()=>{
  assert.match(core,/notifications: 'notification_id,member_id/);
  assert.match(core,/case 'getMyNotifications':return notificationInbox_/);
  assert.match(core,/case 'markNotificationRead':return notificationMarkRead_/);
  assert.match(core,/NGD_NOTIFICATIONS_ENABLED/);
  assert.doesNotMatch(notifications,/\bMailApp\b|\bUrlFetchApp\b|\bGmailApp\b/);
});

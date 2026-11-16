/**
 * NGULIK DIGITAL — in-app notification inbox (staging only).
 *
 * No email or WhatsApp transmission. No external API, credentials or recipients.
 * Intended source is an idempotent projection of existing support activities;
 * this does not make support-ticket writes depend on a second table.
 *
 * One master switch NGD_MUTATIONS_ENABLED controls inbox and mutations.
 */
function notificationsEnabled_() {
  return mutationsEnabled_();
}
function requireNotificationsEnabled_() {
  require_(notificationsEnabled_(),'MAINTENANCE','Notifikasi belum diaktifkan.');
}
function notificationView_(row) {
  return {
    notification_id:row.notification_id,
    source:row.source,
    source_id:row.source_id,
    jenis:row.jenis,
    judul:row.judul,
    pesan:row.pesan,
    status:row.status,
    created_at:row.created_at instanceof Date?isoWib_(row.created_at):row.created_at,
    read_at:row.read_at instanceof Date?isoWib_(row.read_at):row.read_at
  };
}
function notificationInbox_(member) {
  if (!notificationsEnabled_())
    return {enabled:false,items:[],unread:0};
  var rows=readAll_('notifications').filter(function(r){
    return r.member_id===member.member_id;
  });
  return {enabled:true,unread:rows.filter(function(r){return r.status==='UNREAD';}).length,
    items:rows.slice(-50).reverse().map(notificationView_)};
}
function notificationMarkRead_(member,p) {
  requireNotificationsEnabled_();
  return withLock_(function(){
    var id=String(p.notification_id||'');
    require_(/^NTF-[A-Fa-f0-9]{12}$/.test(id),'VALIDATION','ID notifikasi tidak valid.');
    var row=byId_('notifications','notification_id',id);
    require_(row&&row.member_id===member.member_id,'NOT_FOUND','Notifikasi tidak ditemukan.');
    if(row.status==='READ')return {notification_id:id,status:'READ',already_read:true};
    require_(row.status==='UNREAD','CONFLICT','Status notifikasi tidak valid.');
    updateRow_('notifications',row._row,{status:'READ',read_at:now_()});
    return {notification_id:id,status:'READ',already_read:false};
  });
}
// Private internal writer only. Never bind it to arbitrary payloads from the browser.
// The source event ID is the idempotency key, not a randomly generated request ID.
function notificationEnqueue_(memberId,sourceId,kind,title,message) {
  requireNotificationsEnabled_();
  require_(Boolean(byId_('members','member_id',memberId)),
    'NOT_FOUND','Penerima internal tidak tersedia.');
  sourceId=safeText_(sourceId,80);
  require_(/^TA-[A-Fa-f0-9]{12}$/.test(sourceId),
    'VALIDATION','Referensi aktivitas tidak valid.');
  require_(['STATUS','BALASAN'].indexOf(kind)>=0,
    'VALIDATION','Jenis notifikasi tidak dikenal.');
  title=safeText_(title,120);
  message=safeText_(message,250);
  require_(title.length>=3&&message.length>=3,'VALIDATION','Isi notifikasi tidak valid.');
  var prior=findRows_('notifications',function(r){
    return r.member_id===memberId&&r.source==='SUPPORT'&&r.source_id===sourceId;
  });
  require_(prior.length<=1,'RECONCILIATION_REQUIRED','Notifikasi sumber duplikat.');
  if(prior.length)return {notification_id:prior[0].notification_id,already_queued:true};
  var record={notification_id:recordId_('NTF'),member_id:memberId,
    source:'SUPPORT',source_id:sourceId,jenis:kind,judul:title,pesan:message,
    status:'UNREAD',created_at:now_(),read_at:'',request_id:'SUPPORT:'+sourceId};
  appendRow_('notifications',record);
  return {notification_id:record.notification_id,already_queued:false};
}
// Owner-run/manual staging materializer: reconcile up to 25 notifications per run.
// No email/WhatsApp calls. Safe to retry after an interruption.
function buildSupportNotifications() {
  requireMutationsEnabled_();
  requireNotificationsEnabled_();
  return withLock_(function(){
    var ownerByTicket={};
    readAll_('support_tickets').forEach(function(t){
      ownerByTicket[String(t.ticket_id)]=t.member_id;
    });
    var seen={};
    readAll_('notifications').forEach(function(n){
      if(n.source==='SUPPORT')seen[String(n.member_id)+'|'+String(n.source_id)]=true;
    });
    var events=readAll_('ticket_activities'),created=0,skipped=0;
    for(var i=0;i<events.length&&created<25;i++){
      var a=events[i],owner=ownerByTicket[String(a.ticket_id)];
      if(!owner||a.actor_role!=='ADMIN'||['STATUS','BALASAN'].indexOf(a.jenis)<0){
        skipped++;continue;
      }
      var key=owner+'|'+String(a.activity_id||'');
      if(seen[key]){skipped++;continue;}
      var title=a.jenis==='BALASAN'?'Balasan baru dari admin':'Pembaruan status bantuan';
      var message=a.jenis==='BALASAN'
        ?'Ada balasan pada tiket '+String(a.ticket_id)+'. Buka Bantuan untuk membaca.'
        :'Status tiket '+String(a.ticket_id)+' telah diperbarui ke '+String(a.ke_status)+'.';
      var queued=notificationEnqueue_(owner,a.activity_id,a.jenis,title,message);
      if(!queued.already_queued)created++;
      seen[key]=true;
    }
    return {created:created,skipped:skipped,scanned:events.length};
  });
}

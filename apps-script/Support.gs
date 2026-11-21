/**
 * Ngulik Digital — Member 360, Support Ticketing, Product Releases.
 * Requires Code.gs globals, all execution gated by doPost and authenticated
 * member/admin router. No automatic email, WhatsApp or monetary actions.
 * Storage: support_tickets, ticket_activities, product_releases.
 */

function supportDate_(value) {
  if(value instanceof Date)return isoWib_(value);
  return value||'';
}
function supportTicketView_(t) {
  var keys=['ticket_id','member_id','product_id','order_id','kategori','judul',
    'deskripsi','platform','versi_aplikasi','status','prioritas','assigned_to',
    'created_at','updated_at','resolved_at','closed_at'];
  var out={};
  keys.forEach(function(k){out[k]=supportDate_(t[k]);});
  return out;
}
function supportActivityView_(a) {
  var keys=['activity_id','ticket_id','actor_id','actor_role','jenis','dari_status',
    'ke_status','pesan','created_at'];
  var out={};
  keys.forEach(function(k){out[k]=supportDate_(a[k]);});
  return out;
}
function supportReleaseView_(r) {
  var keys=['release_id','product_id','versi','judul','ringkasan','tipe_rilis',
    'status','published_at','created_at'];
  var out={};
  keys.forEach(function(k){out[k]=supportDate_(r[k]);});
  return out;
}
function supportMemberProducts_(member,orders,products) {
  var owned={},index={};
  products.forEach(function(p){index[String(p.product_id)]=p;});
  orders.forEach(function(o){
    if(o.member_id!==member.member_id||['PAID','FULFILLED'].indexOf(o.status)<0)return;
    var id=String(o.product_id);
    if(!index[id])return;
    if(!owned[id]||new Date(o.paid_at||o.created_at).getTime()>
                     new Date(owned[id].paid_at||owned[id].created_at).getTime())owned[id]=o;
  });
  return Object.keys(owned).map(function(id){
    var p=index[id],o=owned[id],expires='',state='TERVERIFIKASI';
    if(p.tipe==='LANGGANAN_30H'){
      expires=member.akses_3in1_sampai;
      state=expires?(new Date(expires).getTime()>Date.now()?'AKTIF':'BERAKHIR'):
        'MENUNGGU_PEMENUHAN';
    } else if(p.tipe==='SEAT_30H'){
      expires=member.canva_berakhir;
      var isActive=['AKTIF_BULAN_1','AKTIF_BULAN_2'].indexOf(member.status_canva)>=0;
      if(isActive&&expires&&new Date(expires).getTime()>Date.now())state='AKTIF';
      else if(isActive&&expires)state='BERAKHIR';
      else state='MENUNGGU_AKTIVASI';
    } else if(p.tipe==='LISENSI_SEKALI'){
      state=member.status_pos==='AKTIF'?'AKTIF':
        o.status==='FULFILLED'?'PERLU_REKONSILIASI':'MENUNGGU_AKTIVASI';
    } else if(['TOPUP_KREDIT','TOPUP_TOKEN'].indexOf(String(p.tipe))>=0)
      state=o.status==='FULFILLED'?'KREDIT_TERCATAT':'MENUNGGU_PEMENUHAN';
    return {product_id:id,nama:p.nama,tipe:p.tipe,order_id:o.order_id,
      order_status:o.status,paid_at:supportDate_(o.paid_at),
      akses_status:state,berakhir_at:supportDate_(expires)};
  });
}
function supportCanReport_(member,productId,category,orderId,orders,products) {
  if(!productId){
    require_(category==='PERTANYAAN','VALIDATION',
      'Pilih produk untuk laporan bug atau permintaan fitur.');
    require_(!orderId,'VALIDATION','Order tidak sesuai produk.');
    return {order_id:''};
  }
  var product=products.filter(function(p){return p.product_id===productId;})[0];
  require_(product,'NOT_FOUND','Produk tidak ditemukan.');
  var eligible=orders.filter(function(o){
    return o.member_id===member.member_id&&o.product_id===productId&&
      ['PAID','FULFILLED'].indexOf(o.status)>=0&&(!orderId||o.order_id===orderId);
  });
  require_(eligible.length>0,'FORBIDDEN',
    'Belum ada pembelian terverifikasi untuk produk ini.');
  eligible.sort(function(a,b){
    return new Date(b.paid_at||b.created_at).getTime()-
           new Date(a.paid_at||a.created_at).getTime();
  });
  return {order_id:eligible[0].order_id};
}
function supportTicketInput_(payload) {
  var p=payload||{},category=String(p.kategori||'').trim().toUpperCase();
  require_(['BUG','FITUR','PERTANYAAN'].indexOf(category)>=0,'VALIDATION',
    'Kategori laporan tidak valid.');
  var title=safeText_(p.judul,120),description=safeText_(p.deskripsi,2000);
  require_(title.length>=8,'VALIDATION','Judul minimal 8 karakter.');
  require_(description.length>=20,'VALIDATION','Penjelasan minimal 20 karakter.');
  var platform=String(p.platform||'LAINNYA').toUpperCase();
  require_(['ANDROID','WINDOWS','WEB','LAINNYA'].indexOf(platform)>=0,
    'VALIDATION','Platform tidak dikenal.');
  var version=safeText_(p.versi_aplikasi,32);
  require_(!version||/^[a-zA-Z0-9._-]{1,32}$/.test(version),
    'VALIDATION','Versi aplikasi tidak valid.');
  var productId=safeText_(p.product_id,80),orderId=safeText_(p.order_id,80);
  return {kategori:category,judul:title,deskripsi:description,platform:platform,
    versi_aplikasi:version,product_id:productId,order_id:orderId};
}
function supportActivity_(ticket,actor,kind,from,to,message,requestId) {
  appendRow_('ticket_activities',{
    activity_id:recordId_('TA'),ticket_id:ticket.ticket_id,
    actor_id:actor.member_id,actor_role:actor.role,jenis:kind,
    dari_status:from||'',ke_status:to||'',pesan:message||'',
    created_at:now_(),request_id:requestId
  });
}
function supportOpenTicket_(member,p,requestId) {
  return withLock_(function(){
    var input=supportTicketInput_(p);
    var previous=findRows_('support_tickets',function(t){return t.request_id===requestId;});
    require_(previous.length<=1,'RECONCILIATION_REQUIRED',
      'ID laporan tidak unik.');
    if(previous.length){
      var old=previous[0];
      require_(old.member_id===member.member_id&&old.product_id===input.product_id&&
        old.kategori===input.kategori&&old.judul===input.judul&&
        old.deskripsi===input.deskripsi&&old.platform===input.platform&&
        old.versi_aplikasi===input.versi_aplikasi&&
        (!input.order_id||old.order_id===input.order_id),'CONFLICT',
        'ID permintaan sudah digunakan untuk laporan berbeda.');
      // Recover one missing CREATED activity if the first request stopped
      // between writing the ticket and creating its initial event.
      var found=findRows_('ticket_activities',function(a){
        return a.ticket_id===old.ticket_id&&a.request_id===requestId;
      });
      if(!found.length)supportActivity_(old,member,'DIBUAT','','OPEN','Laporan dibuat.',requestId);
      return supportTicketView_(old);
    }
    var conflicts=findRows_('ticket_activities',function(a){return a.request_id===requestId;});
    require_(!conflicts.length,'CONFLICT','ID permintaan sudah dipakai untuk aktivitas lain.');
    var now=now_(),recent=findRows_('support_tickets',function(t){
      return t.member_id===member.member_id&&
        new Date(t.created_at).getTime()>now.getTime()-86400000;
    });
    // Also deduplicate a submission lost across browser refresh or transport
    // timeout when the client could not preserve its original request_id.
    var duplicate=recent.filter(function(t){
      return new Date(t.created_at).getTime()>now.getTime()-15*60000&&
        t.product_id===input.product_id&&t.kategori===input.kategori&&
        t.judul===input.judul&&t.deskripsi===input.deskripsi&&
        t.platform===input.platform&&t.versi_aplikasi===input.versi_aplikasi&&
        (!input.order_id||t.order_id===input.order_id);
    })[0];
    if(duplicate){
      var initial=findRows_('ticket_activities',function(a){
        return a.ticket_id===duplicate.ticket_id&&a.jenis==='DIBUAT';
      });
      if(!initial.length)
        supportActivity_(duplicate,member,'DIBUAT','','OPEN',
          'Laporan dibuat.',duplicate.request_id);
      return supportTicketView_(duplicate);
    }
    require_(recent.length<5,'RATE_LIMIT','Maksimal lima tiket baru per 24 jam.');
    var open=findRows_('support_tickets',function(t){
      return t.member_id===member.member_id&&t.status!=='CLOSED';
    });
    require_(open.length<10,'RATE_LIMIT','Terlalu banyak tiket terbuka.');
    var ownership=supportCanReport_(member,input.product_id,input.kategori,
      input.order_id,readAll_('orders'),readAll_('katalog_produk'));
    var ticket={ticket_id:recordId_('SUP'),member_id:member.member_id,
      product_id:input.product_id,order_id:ownership.order_id,
      kategori:input.kategori,judul:input.judul,deskripsi:input.deskripsi,
      platform:input.platform,versi_aplikasi:input.versi_aplikasi,
      status:'OPEN',prioritas:'P3',assigned_to:'',created_at:now,
      updated_at:now,resolved_at:'',closed_at:'',request_id:requestId};
    appendRow_('support_tickets',ticket);
    supportActivity_(ticket,member,'DIBUAT','','OPEN','Laporan dibuat.',requestId);
    return supportTicketView_(ticket);
  });
}
function supportFindTicket_(actor,id) {
  var t=byId_('support_tickets','ticket_id',String(id||''));
  require_(t,'NOT_FOUND','Tiket tidak ditemukan.');
  require_(actor.role==='ADMIN'||t.member_id===actor.member_id,
    'FORBIDDEN','Tiket tidak ditemukan.');
  return t;
}
function supportGetTicket_(actor,id) {
  var t=supportFindTicket_(actor,id);
  var acts=findRows_('ticket_activities',function(a){return a.ticket_id===t.ticket_id;});
  acts.sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);});
  return {ticket:supportTicketView_(t),activities:acts.slice(-100).map(supportActivityView_)};
}
function supportListMine_(member) {
  return findRows_('support_tickets',function(t){return t.member_id===member.member_id;})
    .slice(-50).reverse().map(supportTicketView_);
}
function supportListAdmin_(p) {
  var category=String(p.kategori||''),status=String(p.status||''),
      productId=safeText_(p.product_id,80);
  require_(!category||['BUG','FITUR','PERTANYAAN'].indexOf(category)>=0,
    'VALIDATION','Filter kategori tidak dikenal.');
  require_(!status||['OPEN','TRIAGE','IN_PROGRESS','WAITING_MEMBER','RESOLVED','CLOSED'].indexOf(status)>=0,
    'VALIDATION','Filter status tidak dikenal.');
  var members=readAll_('members'),names={};
  members.forEach(function(m){names[m.member_id]=m.nama;});
  return readAll_('support_tickets').filter(function(t){
    return (!status||t.status===status)&&(!category||t.kategori===category)&&
      (!productId||t.product_id===productId);
  }).slice(-100).reverse().map(function(t){
    var view=supportTicketView_(t);
    view.nama_member=names[t.member_id]||'Member';
    return view;
  });
}
function supportChangeStatus_(admin,p,requestId) {
  return withLock_(function(){
    var t=supportFindTicket_(admin,p.ticket_id);
    var to=String(p.status||''),note=safeText_(p.catatan,1000);
    var allowed={
      OPEN:['TRIAGE','IN_PROGRESS'],
      TRIAGE:['IN_PROGRESS','WAITING_MEMBER'],
      IN_PROGRESS:['WAITING_MEMBER','RESOLVED'],
      WAITING_MEMBER:['IN_PROGRESS','RESOLVED'],
      RESOLVED:['CLOSED','IN_PROGRESS'],
      CLOSED:['OPEN']
    };
    require_(note.length>=8,'VALIDATION','Catatan penanganan minimal 8 karakter.');
    var prior=findRows_('ticket_activities',function(a){return a.request_id===requestId;});
    require_(prior.length<=1,'RECONCILIATION_REQUIRED','ID aktivitas tidak unik.');
    if(prior.length){
      var event=prior[0];
      require_(event.ticket_id===t.ticket_id&&event.jenis==='STATUS'&&
        event.ke_status===to&&event.pesan===note,
        'CONFLICT','ID permintaan sudah digunakan untuk perubahan lain.');
      if(t.status===event.dari_status){
        updateRow_('support_tickets',t._row,{status:to,updated_at:now_(),
          assigned_to:admin.member_id,
          resolved_at:to==='RESOLVED'?now_():t.resolved_at,
          closed_at:to==='CLOSED'?now_():t.closed_at});
        t=byId_('support_tickets','ticket_id',t.ticket_id);
      }
      require_(t.status===to,'RECONCILIATION_REQUIRED',
        'Status tiket berbeda dari riwayat aktivitas.');
      return supportTicketView_(t);
    }
    require_(allowed[t.status]&&allowed[t.status].indexOf(to)>=0,
      'CONFLICT','Perpindahan status tidak diizinkan.');
    supportActivity_(t,admin,'STATUS',t.status,to,note,requestId);
    updateRow_('support_tickets',t._row,{status:to,updated_at:now_(),
      assigned_to:admin.member_id,
      resolved_at:to==='RESOLVED'?now_():t.resolved_at,
      closed_at:to==='CLOSED'?now_():t.closed_at});
    return supportTicketView_(byId_('support_tickets','ticket_id',t.ticket_id));
  });
}
function supportSetPriority_(admin,p,requestId) {
  return withLock_(function(){
    var t=supportFindTicket_(admin,p.ticket_id);
    var next=String(p.prioritas||''),note=safeText_(p.catatan,1000);
    require_(['P0','P1','P2','P3'].indexOf(next)>=0,
      'VALIDATION','Prioritas tiket tidak valid.');
    require_(note.length>=8,'VALIDATION','Catatan prioritas minimal 8 karakter.');
    require_(t.status!=='CLOSED','CONFLICT','Tiket ditutup. Buka kembali terlebih dahulu.');
    var prior=findRows_('ticket_activities',function(a){return a.request_id===requestId;});
    require_(prior.length<=1,'RECONCILIATION_REQUIRED','ID aktivitas prioritas tidak unik.');
    if(prior.length){
      var event=prior[0];
      require_(event.ticket_id===t.ticket_id&&event.jenis==='PRIORITAS'&&
        event.ke_status===next&&
        event.pesan.indexOf(' | '+note)>=0,
        'CONFLICT','ID permintaan sudah digunakan untuk prioritas berbeda.');
      if(t.prioritas===event.dari_status)
        updateRow_('support_tickets',t._row,{prioritas:next,
          assigned_to:admin.member_id,updated_at:now_()});
      else require_(t.prioritas===next,'RECONCILIATION_REQUIRED',
        'Prioritas perlu rekonsiliasi dengan aktivitas.');
      return supportTicketView_(byId_('support_tickets','ticket_id',t.ticket_id));
    }
    require_(t.prioritas!==next,'CONFLICT','Prioritas sudah sama.');
    supportActivity_(t,admin,'PRIORITAS',t.prioritas,next,
      'Prioritas '+t.prioritas+' → '+next+' | '+note,requestId);
    updateRow_('support_tickets',t._row,{prioritas:next,
      assigned_to:admin.member_id,updated_at:now_()});
    return supportTicketView_(byId_('support_tickets','ticket_id',t.ticket_id));
  });
}
function supportReply_(actor,p,requestId) {
  return withLock_(function(){
    var t=supportFindTicket_(actor,p.ticket_id),message=safeText_(p.pesan,1500);
    require_(message.length>=2,'VALIDATION','Balasan minimal 2 karakter.');
    var prior=findRows_('ticket_activities',function(a){return a.request_id===requestId;});
    require_(prior.length<=1,'RECONCILIATION_REQUIRED','ID balasan tidak unik.');
    if(prior.length){
      var event=prior[0];
      require_(event.ticket_id===t.ticket_id&&
        event.actor_id===actor.member_id&&event.pesan===message&&
        event.jenis==='BALASAN','CONFLICT',
        'ID permintaan digunakan untuk balasan berbeda.');
      if(t.status===event.dari_status&&event.ke_status!==event.dari_status){
        // Recover a failed status write after the reply event was persisted.
        updateRow_('support_tickets',t._row,{status:event.ke_status,
          updated_at:now_(),resolved_at:event.ke_status==='OPEN'?'':t.resolved_at});
        t=byId_('support_tickets','ticket_id',t.ticket_id);
      }
      require_(t.status===event.ke_status,'RECONCILIATION_REQUIRED',
        'Status tiket perlu rekonsiliasi dengan riwayat balasan.');
      return supportGetTicket_(actor,t.ticket_id);
    }
    require_(t.status!=='CLOSED','CONFLICT','Tiket sudah ditutup. Buat laporan baru.');
    var reopen=t.status==='RESOLVED'&&actor.role!=='ADMIN';
    var target=reopen?'OPEN':t.status;
    supportActivity_(t,actor,'BALASAN',t.status,target,message,requestId);
    updateRow_('support_tickets',t._row,{
      status:target,updated_at:now_(),
      closed_at:target==='OPEN'?'':t.closed_at,
      resolved_at:reopen?'':t.resolved_at
    });
    return supportGetTicket_(actor,t.ticket_id);
  });
}
function supportOverview_() {
  var data=readAll_('support_tickets'),byStatus={},issues=[];
  data.forEach(function(t){byStatus[t.status]=(byStatus[t.status]||0)+1;});
  var acts=readAll_('ticket_activities'),counts={},lastStatus={};
  acts.forEach(function(a){
    counts[a.ticket_id]=(counts[a.ticket_id]||0)+1;
    if(a.ke_status&&a.jenis!=='PRIORITAS')lastStatus[a.ticket_id]=a.ke_status;
  });
  data.forEach(function(t){
    if(!counts[t.ticket_id])issues.push({ticket_id:t.ticket_id,reason:'MISSING_ACTIVITY'});
    else if(lastStatus[t.ticket_id]&&lastStatus[t.ticket_id]!==t.status)
      issues.push({ticket_id:t.ticket_id,reason:'STATUS_ACTIVITY_DIVERGENCE'});
    if(t.status==='OPEN'&&Date.now()-new Date(t.created_at).getTime()>48*3600000)
      issues.push({ticket_id:t.ticket_id,reason:'UNTRIAGED_48H'});
  });
  return {total:data.length,by_status:byStatus,
    urgent:data.filter(function(t){return ['P0','P1'].indexOf(t.prioritas)>=0&&t.status!=='CLOSED';}).length,
    needs_review:issues.length,findings:issues.slice(0,40)};
}
function supportSearchMembers_(p) {
  var query=safeText_(p.query,100).toLowerCase(),
    productId=safeText_(p.product_id,80),
    status=String(p.status||'').toUpperCase(),
    access=String(p.akses_status||'').toUpperCase();
  var allowedAccess=['AKTIF','BERAKHIR','MENUNGGU_AKTIVASI',
    'MENUNGGU_PEMENUHAN','PERLU_REKONSILIASI','KREDIT_TERCATAT','TERVERIFIKASI'];
  require_(!query||query.length>=2,'VALIDATION','Pencarian minimal 2 karakter.');
  require_(!status||['AKTIF','WAITING_LIST','SUSPENDED'].indexOf(status)>=0,
    'VALIDATION','Status pencarian tidak dikenal.');
  require_(!access||allowedAccess.indexOf(access)>=0,'VALIDATION',
    'Status akses produk tidak dikenal.');
  require_(!access||productId,'VALIDATION',
    'Pilih produk sebelum memfilter status akses.');
  require_(query||productId||status,'VALIDATION','Isi kata kunci atau filter.');
  var orders=readAll_('orders'),products=readAll_('katalog_produk');
  if(productId)require_(products.some(function(x){return x.product_id===productId;}),
    'NOT_FOUND','Produk tidak ditemukan.');
  var results=readAll_('members').filter(function(m){
    if(m.role!=='MEMBER'||status&&m.status!==status)return false;
    var text=[m.member_id,m.nama,m.nama_usaha,m.wa].join(' ').toLowerCase();
    if(query&&text.indexOf(query)<0)return false;
    if(!productId)return true;
    var entries=supportMemberProducts_(m,orders,products);
    return entries.some(function(a){
      return a.product_id===productId&&(!access||a.akses_status===access);
    });
  });
  return {total:results.length,items:results.slice(0,50).map(function(m){
    var productsOwned=supportMemberProducts_(m,orders,products);
    var selected=productId?productsOwned.filter(function(o){return o.product_id===productId;})[0]:null;
    return {member_id:m.member_id,nama:m.nama,nama_usaha:m.nama_usaha,
      status:m.status,wa_akhir:String(m.wa||'').slice(-4),
      akses_status:selected?selected.akses_status:'',
      produk:productsOwned.map(function(o){return o.product_id;})};
  })};
}
function supportProductImpact_(p) {
  var productId=safeText_(p.product_id,80),
    product=byId_('katalog_produk','product_id',productId);
  require_(product,'NOT_FOUND','Produk tidak ditemukan.');
  var orders=readAll_('orders'),products=readAll_('katalog_produk'),
    members=readAll_('members'),tickets=readAll_('support_tickets'),
    counts={},owners=0;
  members.forEach(function(m){
    if(m.role!=='MEMBER')return;
    var entitlement=supportMemberProducts_(m,orders,products).filter(function(a){
      return a.product_id===productId;
    })[0];
    if(!entitlement)return;
    owners++;
    counts[entitlement.akses_status]=(counts[entitlement.akses_status]||0)+1;
  });
  var unresolved=tickets.filter(function(t){
    return t.product_id===productId&&t.status!=='CLOSED'&&t.status!=='RESOLVED';
  });
  return {product_id:productId,nama:product.nama,
    total_pembeli:owners,berdasarkan_status:counts,
    tiket_terbuka:unresolved.length,
    bug_terbuka:unresolved.filter(function(t){return t.kategori==='BUG';}).length,
    prioritas_tinggi:unresolved.filter(function(t){
      return t.prioritas==='P0'||t.prioritas==='P1';
    }).length,
    dihitung_at:isoWib_(now_())};
}
function supportGetMember360_(memberId) {
  var m=byId_('members','member_id',String(memberId||''));
  require_(m&&m.role==='MEMBER','NOT_FOUND','Member tidak ditemukan.');
  var orders=findRows_('orders',function(o){return o.member_id===m.member_id;});
  var tickets=findRows_('support_tickets',function(t){return t.member_id===m.member_id;});
  var productAccess=supportMemberProducts_(m,orders,readAll_('katalog_produk'));
  return {
    profil:{member_id:m.member_id,nama:m.nama,nama_usaha:m.nama_usaha,
      wa:m.wa,jenis_usaha:m.jenis_usaha,kota:m.kota,status:m.status,
      joined_at:supportDate_(m.joined_at),status_pos:m.status_pos,
      status_canva:m.status_canva,akses_3in1_sampai:supportDate_(m.akses_3in1_sampai)},
    produk:productAccess,
    pesanan:orders.slice(-25).reverse().map(function(o){
      return {order_id:o.order_id,product_id:o.product_id,nama_produk:o.nama_produk,
        status:o.status,paid_at:supportDate_(o.paid_at)};
    }),
    tiket:tickets.slice(-25).reverse().map(supportTicketView_)
  };
}
function supportReleaseInput_(p) {
  var productId=safeText_(p.product_id,80),
      version=safeText_(p.versi,32),title=safeText_(p.judul,120),
      summary=safeText_(p.ringkasan,1500),
      kind=String(p.tipe_rilis||'PATCH').toUpperCase();
  require_(/^v?\d{1,4}\.\d{1,4}(?:\.\d{1,4})?$/.test(version),
    'VALIDATION','Versi harus berbentuk 1.2.3.');
  require_(title.length>=8&&summary.length>=20,'VALIDATION',
    'Judul atau ringkasan rilis terlalu pendek.');
  require_(['PATCH','MINOR','MAJOR','NOTICE'].indexOf(kind)>=0,
    'VALIDATION','Jenis rilis tidak dikenal.');
  return {product_id:productId,versi:version,judul:title,
    ringkasan:summary,tipe_rilis:kind};
}
function supportCreateRelease_(admin,p,requestId) {
  return withLock_(function(){
    var input=supportReleaseInput_(p);
    require_(byId_('katalog_produk','product_id',input.product_id),
      'NOT_FOUND','Produk tidak ditemukan.');
    var all=readAll_('product_releases'),
        previous=all.filter(function(x){return x.request_id===requestId;});
    require_(previous.length<=1,'RECONCILIATION_REQUIRED','ID rilis tidak unik.');
    if(previous.length){
      var old=previous[0];
      require_(old.product_id===input.product_id&&old.versi===input.versi&&
        old.ringkasan===input.ringkasan&&old.judul===input.judul&&
        old.tipe_rilis===input.tipe_rilis,'CONFLICT',
        'ID permintaan sudah digunakan untuk rilis berbeda.');
      return supportReleaseView_(old);
    }
    require_(!all.some(function(x){return x.product_id===input.product_id&&
      x.versi===input.versi;}),'CONFLICT','Versi produk ini sudah tercatat.');
    var row={release_id:recordId_('REL'),product_id:input.product_id,
      versi:input.versi,judul:input.judul,ringkasan:input.ringkasan,
      tipe_rilis:input.tipe_rilis,status:'DRAFT',created_at:now_(),
      published_at:'',created_by:admin.member_id,request_id:requestId};
    appendRow_('product_releases',row);
    return supportReleaseView_(row);
  });
}
function supportPublishRelease_(admin,p) {
  return withLock_(function(){
    var r=byId_('product_releases','release_id',String(p.release_id||''));
    require_(r,'NOT_FOUND','Rilis tidak ditemukan.');
    if(r.status==='PUBLISHED')return supportReleaseView_(r);
    require_(r.status==='DRAFT','CONFLICT','Rilis tidak dapat dipublikasikan.');
    updateRow_('product_releases',r._row,{status:'PUBLISHED',published_at:now_()});
    return supportReleaseView_(byId_('product_releases','release_id',r.release_id));
  });
}
function supportReleasesForMember_(member,p) {
  var productId=safeText_(p.product_id,80);
  var owned=supportMemberProducts_(member,readAll_('orders'),readAll_('katalog_produk'))
    .map(function(r){return r.product_id;});
  if(productId)require_(owned.indexOf(productId)>=0,'FORBIDDEN',
    'Tidak memiliki akses riwayat pembelian produk tersebut.');
  return readAll_('product_releases').filter(function(r){
    return r.status==='PUBLISHED'&&owned.indexOf(r.product_id)>=0&&
      (!productId||r.product_id===productId);
  }).slice(-50).reverse().map(supportReleaseView_);
}
function supportAdminReleases_() {
  return readAll_('product_releases').slice(-100).reverse().map(supportReleaseView_);
}

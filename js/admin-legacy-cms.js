/* Admin editorial tables: transparent editable forms, no secrets in browser storage.
 * Data is fetched only after a server-authorized ADMIN session.
 */
(function(global){
 'use strict';
 const h=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const specs={
  ai_tools:{label:'Studio AI',id:'tool_id',fields:[
   ['nama','Nama','text'],['deskripsi','Deskripsi','textarea'],
   ['placeholder_input','Petunjuk input','text'],
   ['prompt_template','Template instruksi internal','textarea'],
   ['kredit_biaya','Biaya kredit','number'],['urut','Urutan','number'],
   ['aktif','Aktif','boolean']]},
  modul_belajar:{label:'Portal Belajar',id:'modul_id',fields:[
   ['urut','Urutan','number'],['judul','Judul','text'],['deskripsi','Deskripsi','textarea'],
   ['url_classroom','Tautan materi HTTPS','url'],['aktif','Aktif','boolean']]},
  etalase_affiliate_luar:{label:'Rekomendasi Alat',id:'item_id',fields:[
   ['judul','Judul','text'],['kategori','Kategori','text'],
   ['deskripsi_singkat','Ringkasan','textarea'],
   ['alasan_rekomendasi','Alasan rekomendasi','textarea'],
   ['harga_info','Informasi harga','text'],['link_affiliate','Link partner HTTPS','url'],
   ['gambar_url','Gambar HTTPS','url'],['urut','Urutan','number'],
   ['aktif','Aktif','boolean'],['catatan_admin','Catatan admin','textarea']]}
 };
 function isVisual(item){
  return /\b(?:image|visual|foto|gambar)\b/i.test(String(item?.tool_id||'')+' '+String(item?.nama||''));
 }
 function field(name,label,type,record,locked,visual){
  const value=record?.[name]??'',id='ngd-legacy-'+name;
  if(type==='boolean')
   return '<label class="catalog-check" for="'+id+'"><input id="'+id+'" type="checkbox" name="'+h(name)+'" '+
     (value===true?'checked ':'')+(locked||(visual&&name==='aktif')?'disabled ':'')+
     '><span>'+h(label)+'</span></label>';
  const start='<div class="field"><label for="'+id+'">'+h(label)+'</label>';
  if(type==='textarea')return start+'<textarea class="input" id="'+id+'" name="'+h(name)+
   '" rows="'+(name==='prompt_template'?5:3)+'" '+(locked?'disabled':'')+'>'+h(value)+'</textarea></div>';
  return start+'<input class="input" type="'+type+'" id="'+id+'" name="'+h(name)+
   '" '+(type==='number'?'min="0" step="1" ':'maxlength="1800" ')+
   'value="'+h(value)+'" '+(locked?'disabled':'')+'></div>';
 }
 function render(ctx){
  if(!ctx?.authorized)return '';
  const table=Object.hasOwn(specs,ctx.table)?ctx.table:'ai_tools',schema=specs[table];
  const rows=Array.isArray(ctx.items)?ctx.items:[];
  const chosen=rows.find(x=>String(x[schema.id])===String(ctx.selectedId||''))||null;
  const draft=chosen||Object.fromEntries(schema.fields.map(x=>[x[0],x[2]==='boolean'?false:x[2]==='number'?1:'']));
  const loading=ctx.loading===true;
  const locked=ctx.enabled!==true||loading;
  const visual=table==='ai_tools'&&isVisual({...draft,[schema.id]:chosen?.[schema.id]||ctx.selectedId||''});
  return '<section class="ngd-legacy-cms surface" aria-label="Editor konten pendukung">'+
   '<div class="content-editor-heading"><div><p class="eyebrow">ADMIN / DATABASE KONTEN</p>'+
   '<h2>Kelola Studio, Materi, dan Rekomendasi</h2></div></div>'+
   '<div class="actions" role="group" aria-label="Pilih tabel konten">'+
     Object.entries(specs).map(([key,meta])=>
      '<button type="button" class="btn btn-'+(key===table?'primary':'secondary')+
      ' btn-sm" data-cms-table="'+key+'" aria-pressed="'+String(key===table)+'">'+h(meta.label)+'</button>'
     ).join('')+'</div>'+
   (ctx.error?'<p class="form-hint" role="status">'+h(ctx.error)+'</p>':'')+
   (ctx.enabled!==true?'<p class="form-hint">Mode aman: perubahan data belum diaktifkan pada backend.</p>':'')+
   '<div class="catalog-admin-layout">'+
    '<div><h3>'+h(schema.label)+'</h3><p>'+rows.length+' baris ditemukan</p>'+
     '<div class="catalog-admin-list">'+
     (loading?'<p role="status">Sedang memuat informasi...</p>':
      rows.length?rows.map(r=>
       '<article class="catalog-admin-row"><div class="catalog-admin-row-info"><strong>'+
       h(r.nama||r.judul||r[schema.id])+'</strong><p>'+h(r[schema.id])+
       ' · '+(r.aktif?'Aktif':'Nonaktif')+
       (table==='ai_tools'&&isVisual(r)?' · MODE SIMULASI':'')+
       '</p></div><button type="button" class="btn btn-secondary btn-sm" data-cms-edit="'+h(r[schema.id])+'">Edit</button></article>'
      ).join(''):'<p>Belum ada data yang ditampilkan.</p>')+
     '</div></div>'+
     '<div class="catalog-admin-editor"><div class="content-editor-heading"><h3>'+
        (chosen?'Edit konten':'Konten baru')+'</h3>'+
        '<button type="button" class="btn btn-secondary btn-sm" data-cms-new>Buat baru</button></div>'+
      (visual?'<p class="form-hint"><strong>MODE SIMULASI</strong> — fitur visual/gambar belum memiliki provider AI yang aktif. Jangan promosikan sebagai generator otomatis.</p>':'')+
      '<form id="admin-legacy-cms-form" data-cms-form-table="'+table+
       '" data-cms-form-id="'+h(chosen?.[schema.id]||'')+'">'+
       '<div class="field"><label for="ngd-legacy-id">'+h(schema.id)+'</label>'+
       '<input class="input" id="ngd-legacy-id" name="id" value="'+h(chosen?.[schema.id]||'')+
        '" pattern="[A-Za-z0-9_-]{3,80}" maxlength="80" required '+(chosen?'readonly ':'')+
        (locked?'disabled':'')+'></div>'+
       schema.fields.map(([key,label,type])=>field(key,label,type,draft,locked,visual)).join('')+
       (table==='etalase_affiliate_luar'&&chosen?
        '<p class="form-hint">Klik tercatat: '+h(chosen.klik_total||0)+' (baca saja; riwayat tetap utuh)</p>':'')+
       '<button class="btn btn-primary" type="submit" '+(locked?'disabled':'')+
       '>Simpan '+h(schema.label)+'</button>'+
      '</form>'+
     '</div></div></section>';
 }
 global.NGD_ADMIN_LEGACY_CMS=Object.freeze({render,isVisual,specs});
})(window);

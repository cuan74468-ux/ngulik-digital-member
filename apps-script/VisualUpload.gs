/**
 * Isolated chunked upload for Google Apps Script STAGING.
 * Individual JSON requests stay below Code.gs' 56 KB cap. Each chunk is
 * 24 KiB binary (32 KiB base64) and private in dedicated Drive folder.
 * No public upload URL, P0 writes or API key reaches the browser.
 */
var NGD_VU_CHUNK_BYTES_=24*1024;
var NGD_VU_MAX_BYTES_=4*1024*1024;
function ngdVuNeed_(ok,code){if(!ok)throw Error('VISUAL_UPLOAD_'+code);}
function ngdVuFile_(name){
 var folder=ngdVmDriveFolder_(),files=folder.getFilesByName(name),file=null;
 if(files.hasNext())file=files.next();
 ngdVuNeed_(!files.hasNext(),'DUPLICATE_FILE');
 return {folder:folder,file:file};
}
function ngdVuManifest_(id,owner){
 ngdVuNeed_(typeof id==='string'&&/^[a-f0-9]{32}$/.test(id),'ID_INVALID');
 var found=ngdVuFile_('NGD_VU_'+id+'_MANIFEST');
 ngdVuNeed_(found.file&&!found.file.isTrashed()&&
  found.file.getSharingAccess()===DriveApp.Access.PRIVATE,'UPLOAD_NOT_FOUND');
 var meta;
 try{meta=JSON.parse(found.file.getBlob().getDataAsString());}
 catch(_){throw Error('VISUAL_UPLOAD_METADATA_INVALID');}
 ngdVuNeed_(meta.owner===owner&&meta.expires_at>Date.now(),'UPLOAD_EXPIRED_OR_OWNER');
 return {file:found.file,folder:found.folder,meta:meta};
}
function ngdVisualChunkUpload_(auth){
 ngdVuNeed_(auth&&typeof auth.requireMember==='function','AUTH_REQUIRED');
 function member(token){return ngdVjSession_(auth,token);}
 function create(token,payload){
  var owner=member(token);
  ngdVuNeed_(payload&&['image/jpeg','image/png','image/webp'].includes(payload.mime),
   'MIME_INVALID');
  ngdVuNeed_(Number.isSafeInteger(payload.size)&&payload.size>0&&
   payload.size<=NGD_VU_MAX_BYTES_,'SIZE_INVALID');
  ngdVuNeed_(ngdVjHex_(payload.sha256),'SHA256_INVALID');
  var count=Math.ceil(payload.size/NGD_VU_CHUNK_BYTES_);
  var id=Utilities.getUuid().replace(/-/g,'');
  var meta={owner:owner,mime:payload.mime,size:payload.size,
   sha256:payload.sha256.toLowerCase(),count:count,
   expires_at:Date.now()+60*60*1000,completed_asset:null};
  var folder=ngdVmDriveFolder_();
  var file=folder.createFile('NGD_VU_'+id+'_MANIFEST',
   JSON.stringify(meta),MimeType.PLAIN_TEXT);
  ngdVuNeed_(file.getSharingAccess()===DriveApp.Access.PRIVATE,
   'MANIFEST_NOT_PRIVATE');
  return {upload_id:id,chunk_bytes:NGD_VU_CHUNK_BYTES_,chunk_count:count,
   expires_at:meta.expires_at};
 }
 function put(token,p){
  var owner=member(token),info=ngdVuManifest_(p.upload_id,owner),meta=info.meta;
  ngdVuNeed_(Number.isInteger(p.index)&&p.index>=0&&p.index<meta.count,
   'INDEX_INVALID');
  ngdVuNeed_(typeof p.base64==='string'&&p.base64.length<=34000&&
   /^[a-zA-Z0-9+/]+={0,2}$/.test(p.base64),'CHUNK_BASE64_INVALID');
  var bytes=Utilities.base64Decode(p.base64);
  var expected=p.index===meta.count-1?
   meta.size-p.index*NGD_VU_CHUNK_BYTES_:NGD_VU_CHUNK_BYTES_;
  ngdVuNeed_(bytes.length===expected,'CHUNK_SIZE_MISMATCH');
  var name='NGD_VU_'+p.upload_id+'_CHUNK_'+p.index;
  var existing=ngdVuFile_(name);
  var hash=ngdVmSha256_(bytes);
  if(existing.file){
   ngdVuNeed_(existing.file.getSharingAccess()===DriveApp.Access.PRIVATE,
    'CHUNK_NOT_PRIVATE');
   ngdVuNeed_(existing.file.getDescription()===owner+':'+hash,
    'CHUNK_REPLAY_CONFLICT');
  }else{
   var file=existing.folder.createFile(Utilities.newBlob(bytes,
    'application/octet-stream',name));
   file.setName(name);
   ngdVuNeed_(file.getSharingAccess()===DriveApp.Access.PRIVATE,
    'CHUNK_NOT_PRIVATE');
   file.setDescription(owner+':'+hash);
  }
  return {accepted:true,index:p.index};
 }
 function finish(token,p){
  var owner=member(token),info=ngdVuManifest_(p.upload_id,owner),meta=info.meta;
  if(meta.completed_asset)return {asset_id:meta.completed_asset};
  var bytes=[];
  for(var i=0;i<meta.count;i++){
   var part=ngdVuFile_('NGD_VU_'+p.upload_id+'_CHUNK_'+i).file;
   ngdVuNeed_(part&&part.getSharingAccess()===DriveApp.Access.PRIVATE,
    'CHUNK_MISSING');
   var data=part.getBlob().getBytes();
   ngdVuNeed_(part.getDescription()===owner+':'+ngdVmSha256_(data),
    'CHUNK_TAMPERED');
   bytes=bytes.concat(data);
  }
  ngdVuNeed_(bytes.length===meta.size&&
   ngdVmSha256_(bytes)===meta.sha256,'FINAL_CHECKSUM_MISMATCH');
  ngdVuNeed_(ngdVjSignature_(bytes,meta.mime),'FINAL_MAGIC_MISMATCH');
  var media=ngdVisualMediaDrive_({auth:auth});
  var result=media.upload(token,{mime:meta.mime,
   base64:Utilities.base64Encode(bytes),sha256:meta.sha256});
  meta.completed_asset=result.asset_id;
  info.file.setContent(JSON.stringify(meta));
  for(var j=0;j<meta.count;j++){
   var chunk=ngdVuFile_('NGD_VU_'+p.upload_id+'_CHUNK_'+j).file;
   if(chunk)chunk.setTrashed(true);
  }
  return result;
 }
 return {start:create,chunk:put,finish:finish};
}

/**
 * Safe periodic cleanup: remove expired multipart uploads including orphans.
 * Called only from editor-owned scheduled maintenance, never by a member.
 */
function ngdVisualUploadPurgeExpired_(){
 var folder=ngdVmDriveFolder_(),cursor=folder.getFiles(),now=Date.now();
 var removed=0,scanned=0,files=[],expired={};
 while(cursor.hasNext()&&scanned<800){
  var file=cursor.next(),name=file.getName();scanned++;
  if(!/^NGD_VU_[a-f0-9]{32}_(MANIFEST|CHUNK_\d+)$/.test(name))continue;
  files.push(file);
  if(name.endsWith('_MANIFEST')){
   try{var metadata=JSON.parse(file.getBlob().getDataAsString());
    if(metadata.expires_at<=now)expired[name.slice(7,39)]=true;
   }catch(_){expired[name.slice(7,39)]=true;}
  }
 }
 files.forEach(function(file){
  var id=file.getName().slice(7,39);
  if(expired[id]){file.setTrashed(true);removed++;}
 });
 return {scanned:scanned,purged:removed,has_more:cursor.hasNext()};
}

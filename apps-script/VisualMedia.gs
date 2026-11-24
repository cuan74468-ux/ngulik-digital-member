/**
 * Isolated GAS Drive-backed private visual media.
 * Source only: no folder is created, no sharing is changed, no trigger installed.
 * Requires a dedicated, already-private Drive folder ID in Script Properties.
 *
 * Google Drive scope and Apps Script deployments must be reviewed separately.
 * All endpoints must authenticate the member BEFORE calling this module.
 */
var NGD_VISUAL_MEDIA_MAX_BYTES_=4*1024*1024;
var NGD_VISUAL_MEDIA_TTL_MS_=24*60*60*1000;
function ngdVmNeed_(value,code){if(!value)throw Error('VISUAL_MEDIA_'+code);}
function ngdVmDriveFolder_(){
 ngdVmNeed_(typeof DriveApp!=='undefined'&&typeof PropertiesService!=='undefined',
  'GAS_REQUIRED');
 var folderId=PropertiesService.getScriptProperties().getProperty('NGD_VISUAL_PRIVATE_FOLDER_ID');
 ngdVmNeed_(typeof folderId==='string'&&/^[a-zA-Z0-9_-]{20,110}$/.test(folderId),
  'PRIVATE_FOLDER_NOT_CONFIGURED');
 var folder=DriveApp.getFolderById(folderId);
 ngdVmNeed_(folder.getSharingAccess()===DriveApp.Access.PRIVATE,
  'PRIVATE_FOLDER_ACCESS_REQUIRED');
 return folder;
}
function ngdVmSha256_(bytes){
 var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes);
 return digest.map(function(v){return ('0'+(v&255).toString(16)).slice(-2);}).join('');
}
function ngdVmBytes_(base64,mime){
 ngdVmNeed_(typeof base64==='string'&&base64.length>12&&
  base64.length<=Math.ceil(NGD_VISUAL_MEDIA_MAX_BYTES_*4/3)+8&&
  /^[a-zA-Z0-9+/]+={0,2}$/.test(base64),'BASE64_INVALID');
 ngdVmNeed_(['image/jpeg','image/png','image/webp'].indexOf(mime)>=0,'MIME_INVALID');
 var bytes=Utilities.base64Decode(base64);
 ngdVmNeed_(bytes.length>0&&bytes.length<=NGD_VISUAL_MEDIA_MAX_BYTES_,'SIZE_INVALID');
 ngdVmNeed_(ngdVjSignature_(bytes,mime),'FILE_SIGNATURE_INVALID');
 return bytes;
}
function ngdVmMeta_(file,folder){
 ngdVmNeed_(file&&!file.isTrashed(),'ASSET_NOT_FOUND');
 var parents=file.getParents(),owned=false;
 while(parents.hasNext())if(parents.next().getId()===folder.getId())owned=true;
 ngdVmNeed_(owned&&file.getSharingAccess()===DriveApp.Access.PRIVATE,
  'PRIVATE_PARENT_REQUIRED');
 var meta;
 try{meta=JSON.parse(file.getDescription()||'');}
 catch(_){throw Error('VISUAL_MEDIA_METADATA_INVALID');}
 ngdVmNeed_(meta&&meta.kind==='NGD_VISUAL_PRIVATE_V1'&&
  typeof meta.owner==='string'&&typeof meta.expires_at==='number',
  'METADATA_INVALID');
 return meta;
}
function ngdVisualMediaDrive_(deps){
 var d=deps||{};
 ngdVmNeed_(d.auth&&typeof d.auth.requireMember==='function','AUTH_REQUIRED');
 var now=d.now||function(){return Date.now();};
 function member(session){
  var id=d.auth.requireMember(session);
  ngdVmNeed_(id&&typeof id.member_id==='string'&&
   /^[A-Za-z0-9_-]{3,80}$/.test(id.member_id),'SESSION_REQUIRED');
  return id.member_id;
 }
 function decodeHandle(handle){
  ngdVmNeed_(typeof handle==='string'&&
   /^asset_[A-Za-z0-9_-]{20,110}$/.test(handle),'HANDLE_INVALID');
  return handle.slice(6);
 }
 function owned(handle,owner){
  var folder=ngdVmDriveFolder_(),file=DriveApp.getFileById(decodeHandle(handle));
  var meta=ngdVmMeta_(file,folder);
  ngdVmNeed_(meta.owner===owner&&meta.expires_at>now(),'OWNER_OR_EXPIRED');
  return {file:file,meta:meta};
 }
 function store(owner,mime,bytes,kind,jobId){
  var folder=ngdVmDriveFolder_();
  var blob=Utilities.newBlob(bytes,mime,'ngd-visual-image');
  // Never use a supplied filename, arbitrary URL, shared link, or public URL.
  var file=folder.createFile(blob);
  var expiresAt=now()+NGD_VISUAL_MEDIA_TTL_MS_;
  try{
   ngdVmNeed_(file.getSharingAccess()===DriveApp.Access.PRIVATE,
    'CREATED_FILE_NOT_PRIVATE');
   file.setDescription(JSON.stringify({
    kind:'NGD_VISUAL_PRIVATE_V1',owner:owner,job_id:jobId||'',
    media_kind:kind,mime:mime,bytes:bytes.length,
    sha256:ngdVmSha256_(bytes),created_at:now(),expires_at:expiresAt
   }));
  }catch(e){file.setTrashed(true);throw e;}
  return {asset_id:'asset_'+file.getId(),expires_at:expiresAt};
 }
 function upload(session,input){
  var owner=member(session);
  ngdVmNeed_(input&&typeof input==='object','UPLOAD_INVALID');
  var bytes=ngdVmBytes_(input.base64,input.mime);
  if(input.sha256!==undefined)ngdVmNeed_(
   input.sha256===ngdVmSha256_(bytes),'CHECKSUM_MISMATCH');
  return store(owner,input.mime,bytes,'input',null);
 }
 function putPrivate(input){
  ngdVmNeed_(input&&typeof input.owner==='string'&&
   /^[A-Za-z0-9_-]{3,80}$/.test(input.owner),'OWNER_INVALID');
  ngdVmNeed_(input.media_kind==='output'&&
   /^[A-Za-z0-9_-]{16,80}$/.test(input.job_id||''),'JOB_REQUIRED');
  ngdVmNeed_(['image/jpeg','image/png','image/webp'].includes(input.mime),
   'MIME_INVALID');
  ngdVmNeed_(Array.isArray(input.bytes)&&input.bytes.length>0&&
   input.bytes.length<=NGD_VISUAL_MEDIA_MAX_BYTES_&&
   ngdVjSignature_(input.bytes,input.mime),'CONTENT_INVALID');
  return store(input.owner,input.mime,input.bytes,'output',input.job_id);
 }
 function getOwned(handle,owner,at){
  try{
   var v=owned(handle,owner);
   if(v.meta.expires_at<=(at||now()))return null;
   return {id:handle,owner:owner,private:true,expires_at:v.meta.expires_at,
    mime:v.meta.mime,bytes:v.meta.bytes,sha256:v.meta.sha256,
    job_id:v.meta.job_id,media_kind:v.meta.media_kind};
  }catch(_){return null;}
 }
 function getPrivateBytes(handle,owner,jobId){
  var v=owned(handle,owner);
  if(jobId)ngdVmNeed_(v.meta.job_id===jobId,'JOB_OWNER_REQUIRED');
  var data=v.file.getBlob().getBytes();
  ngdVmNeed_(data.length===v.meta.bytes&&ngdVmSha256_(data)===v.meta.sha256,
   'ASSET_CORRUPT');
  return {bytes:data,mime:v.meta.mime,private:true,owner:owner};
 }
 function download(session,handle,jobId){
  var owner=member(session);
  ngdVmNeed_(typeof jobId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(jobId),
   'JOB_REQUIRED');
  var data=getPrivateBytes(handle,owner,jobId);
  return {mime:data.mime,base64:Utilities.base64Encode(data.bytes)};
 }
 function purgeExpired(at,limit){
  var folder=ngdVmDriveFolder_(),cursor=folder.getFiles(),purged=0,scanned=0;
  var cap=Math.min(100,Math.max(1,limit||50));
  while(cursor.hasNext()&&scanned<cap){
   var file=cursor.next();scanned++;
   var meta;
   try{meta=ngdVmMeta_(file,folder);}catch(_){continue;}
   if(meta.expires_at<=at){file.setTrashed(true);purged++;}
  }
  return {purged:purged,scanned:scanned,has_more:cursor.hasNext()};
 }
 return {upload:upload,putPrivate:putPrivate,getOwned:getOwned,
  getPrivateBytes:getPrivateBytes,download:download,purgeExpired:purgeExpired,
  max_bytes:NGD_VISUAL_MEDIA_MAX_BYTES_};
}

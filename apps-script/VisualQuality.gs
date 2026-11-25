/**
 * P1 Tool #1 — commercial visual quality gate, SOURCE ONLY.
 * Pure scoring/decision helper for future TRUSTED evaluators. This code does
 * not inspect pixels, run an AI model, fetch media, or certify generated images.
 * Never accept a browser-supplied review as trusted measurement.
 */
var NGD_VISUAL_QUALITY_VERSION_='visual-quality-v1';
var NGD_VISUAL_QUALITY_THRESHOLDS_=Object.freeze({
  commercial_appeal:4.3,
  product_fidelity:4.7,
  prompt_adherence:4.4,
  marketing_readiness:4.5
});
function ngdVisualQualityGate_(review,policy) {
  ngdVisualRequire_(ngdVisualIsPlain_(review),'QUALITY_REVIEW_INVALID');
  ngdVisualRequire_(ngdVisualIsPlain_(policy),'QUALITY_POLICY_INVALID');
  ngdVisualRequire_(policy.source==='TRUSTED_BACKEND_EVALUATOR',
    'QUALITY_TRUST_CONTEXT_REQUIRED');
  ngdVisualRequire_(policy.mode==='REFERENCE_PRODUCT'||policy.mode==='CREATIVE_CONCEPT',
    'QUALITY_MODE_INVALID');
  ngdVisualRequire_(typeof policy.job_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(policy.job_id),'QUALITY_JOB_ID_INVALID');
  ngdVisualRequire_(typeof policy.evaluator_version==='string'&&
    /^[A-Za-z0-9._-]{3,80}$/.test(policy.evaluator_version),
    'QUALITY_EVALUATOR_VERSION_INVALID');
  var score={},names=Object.keys(NGD_VISUAL_QUALITY_THRESHOLDS_);
  var allowable=[
    'commercial_appeal','product_fidelity','prompt_adherence','marketing_readiness',
    'confidence','identity_changed','watermark_present','gibberish_text',
    'unsafe_content','overlay_collision','reference_verified'
  ];
  Object.keys(review).forEach(function(k){
    ngdVisualRequire_(allowable.indexOf(k)>=0,'QUALITY_UNKNOWN_FIELD');
  });
  names.forEach(function(k){
    var n=review[k];
    ngdVisualRequire_(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=5,
      'QUALITY_SCORE_'+k.toUpperCase()+'_INVALID');
    score[k]=n;
  });
  ngdVisualRequire_(typeof review.confidence==='number'&&
    Number.isFinite(review.confidence)&&review.confidence>=0&&
    review.confidence<=1,'QUALITY_CONFIDENCE_INVALID');
  var flags=['identity_changed','watermark_present','gibberish_text',
    'unsafe_content','overlay_collision','reference_verified'];
  flags.forEach(function(k){
    ngdVisualRequire_(typeof review[k]==='boolean','QUALITY_FLAG_'+k.toUpperCase()+'_INVALID');
  });
  var preservation=policy.mode==='REFERENCE_PRODUCT';
  var critical=review.unsafe_content||review.watermark_present||
    review.gibberish_text||review.overlay_collision||
    (preservation&&review.identity_changed);
  var missingReference=preservation&&!review.reference_verified;
  var below=names.filter(function(k){
    return (!preservation&&k==='product_fidelity')?false:
      score[k]<NGD_VISUAL_QUALITY_THRESHOLDS_[k];
  });
  var lowConfidence=review.confidence<0.85;
  var decision=critical?'REJECT':
    missingReference||below.length||lowConfidence?'NEEDS_REVIEW':'CANDIDATE_APPROVED';
  return {
    quality_version:NGD_VISUAL_QUALITY_VERSION_,
    job_id:policy.job_id,
    evaluator_version:policy.evaluator_version,
    decision:decision,
    critical_failure:!!critical,
    missing_reference:!!missingReference,
    below_threshold:below,
    low_confidence:lowConfidence,
    scores:score,
    // Approval means only a candidate image passed this rubric;
    // NOT proof of Midjourney parity or permission for commercial release.
    release_authorized:false
  };
}

/** Geometry preflight reads image headers, NOT visual-semantic quality.
 * No provider call, no browser-supplied dimensions, no claim of decoded pixels.
 * Require sufficient dimensions and aspect-ratio error <= 2% relative.
 */
function ngdVisualImageDimensions_(bytes,mime){
 if(!Array.isArray(bytes)||bytes.length<24)return null;
 var n=bytes.length,b=function(i){return bytes[i]&255;};
 var str=function(i,len){return Array.from({length:len},function(_,k){return String.fromCharCode(b(i+k));}).join('');};
 var be16=function(i){return b(i)*256+b(i+1);};
 var be32=function(i){return b(i)*16777216+b(i+1)*65536+b(i+2)*256+b(i+3);};
 var le24=function(i){return b(i)+256*b(i+1)+65536*b(i+2);};
 var le32=function(i){return le24(i)+16777216*b(i+3);};
 var w=0,h=0;
 if(mime==='image/png'){
  if(n<33||b(0)!==137||str(1,3)!=='PNG'||b(4)!==13||b(5)!==10||b(6)!==26||b(7)!==10||be32(8)!==13||str(12,4)!=='IHDR')return null;
  w=be32(16);h=be32(20);
 }else if(mime==='image/jpeg'){
  if(b(0)!==255||b(1)!==216)return null;
  var i=2,sof=[192,193,194,195,197,198,199,201,202,203,205,206,207];
  while(i+4<=n){
   if(b(i++)!==255)return null;
   while(i<n&&b(i)===255)i++;
   if(i>=n)return null;
   var marker=b(i++);
   if(marker===217||marker===218)return null;
   if(marker===1||(marker>=208&&marker<=215))continue;
   if(i+2>n)return null;
   var length=be16(i);
   if(length<2||i+length>n)return null;
   if(sof.indexOf(marker)>=0){if(length<8)return null;h=be16(i+3);w=be16(i+5);break;}
   i+=length;
  }
 }else if(mime==='image/webp'){
  if(str(0,4)!=='RIFF'||str(8,4)!=='WEBP'||le32(4)+8>n)return null;
  var p=12,end=le32(4)+8;
  while(p+8<=end){
   var type=str(p,4),size=le32(p+4),q=p+8;
   if(q+size>end)return null;
   if(type==='VP8X'&&size>=10){w=1+le24(q+4);h=1+le24(q+7);break;}
   if(type==='VP8L'&&size>=5&&b(q)===47){
    w=1+b(q+1)+((b(q+2)&63)<<8);
    h=1+(b(q+2)>>6)+(b(q+3)<<2)+((b(q+4)&15)<<10);break;
   }
   if(type==='VP8 '&&size>=10&&b(q+3)===157&&b(q+4)===1&&b(q+5)===42){
    w=(b(q+6)+256*b(q+7))&16383;h=(b(q+8)+256*b(q+9))&16383;break;
   }
   p=q+size+(size%2);
  }
 }
 return Number.isSafeInteger(w)&&Number.isSafeInteger(h)&&w>0&&h>0?{width:w,height:h}:null;
}
function ngdVisualOutputGeometry_(bytes,mime,format){
 var ratio={'4:5':4/5,'1:1':1,'9:16':9/16,'3:4':3/4}[format];
 var d=ngdVisualImageDimensions_(bytes,mime);
 if(!ratio||!d)return {ok:false,reason:'OUTPUT_HEADER_INVALID'};
 if(Math.min(d.width,d.height)<512||Math.max(d.width,d.height)>8192||d.width*d.height>20000000)
  return {ok:false,reason:'OUTPUT_SIZE_INVALID'};
 if(Math.abs((d.width/d.height)/ratio-1)>0.02)return {ok:false,reason:'OUTPUT_RATIO_MISMATCH'};
 return {ok:true,width:d.width,height:d.height,semantic_quality_verified:false};
}

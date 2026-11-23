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

/**
 * P1 Tool #1 — six-layer deterministic prompt compiler (BACKEND ONLY).
 * Layers 1–5 are concatenated exclusively from allowlisted registry IDs.
 * All user-authored strings, price, CTA and asset reference are excluded from
 * compiled_prompt AND negative_prompt; they belong to overlay/media metadata.
 * Layer 6 is a compositing specification; it is NEVER sent to an image model.
 * This does not call, debit, reserve, persist, or invoke a real provider.
 */
function ngdVisualRegistryEntry_(registry,group,id) {
  ngdVisualRequire_(ngdVisualOwn_(registry[group],id),'REGISTRY_OPTION_NOT_INSTALLED');
  return registry[group][id];
}
function ngdVisualSafeZone_(spec) {
  ngdVisualRequire_(ngdVisualIsPlain_(spec),'SAFE_ZONE_INVALID');
  var keys=['x','y','width','height'],out={};
  keys.forEach(function(k){
    var n=spec[k];
    ngdVisualRequire_(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1,
      'SAFE_ZONE_'+k.toUpperCase()+'_INVALID');
    out[k]=n;
  });
  ngdVisualRequire_(out.width>0&&out.height>0&&
    out.x+out.width<=1.0000001&&out.y+out.height<=1.0000001,
    'SAFE_ZONE_BOUNDS_INVALID');
  return out;
}
function ngdVisualCompilePrompt_(payload,registryOverride) {
  var input=ngdVisualInput_(payload);
  var r=ngdVisualPrivateRegistry_(registryOverride||ngdVisualLoadPrivateSkills_());
  var ids=input.ids;
  var tpl=ngdVisualRegistryEntry_(r,'templates',ids.template_id);
  var mood=ngdVisualRegistryEntry_(r,'moods',ids.mood_id);
  var light=ngdVisualRegistryEntry_(r,'lighting',ids.lighting_id);
  var ratio=ngdVisualRegistryEntry_(r,'ratios',ids.ratio_id);
  var quality=ngdVisualRegistryEntry_(r,'qualities',ids.quality_tier);
  ngdVisualRequire_(ngdVisualIsPlain_(tpl),'TEMPLATE_INVALID');
  ngdVisualRequire_(tpl.category_id===ids.category_id,'CATEGORY_TEMPLATE_MISMATCH');
  ngdVisualRequire_(typeof tpl.preservation_id==='string','PRESERVATION_ID_MISSING');
  var preserve=ngdVisualRegistryEntry_(r,'preservation',tpl.preservation_id);
  var w=ratio.width,h=ratio.height;
  ngdVisualRequire_(Number.isSafeInteger(w)&&w>=256&&w<=8192&&
    Number.isSafeInteger(h)&&h>=256&&h<=8192,'RATIO_DIMENSIONS_INVALID');
  var safe=ngdVisualSafeZone_(ratio.safe_zone);
  var layers=[
    {id:'01_SUBJECT_PRESERVATION',
     text:ngdVisualConfigString_(preserve,'PRESERVATION',2400)},
    {id:'02_ART_DIRECTION',
     text:ngdVisualConfigString_(tpl.art_direction,'ART_DIRECTION',2400)},
    {id:'03_MOOD_LIGHTING',
     text:ngdVisualConfigString_(mood.visual_skill,'MOOD',1500)+'\n'+
       ngdVisualConfigString_(light.lighting_skill,'LIGHTING',1500)},
    {id:'04_FRAMING_SAFE_ZONE',
     text:ngdVisualConfigString_(ratio.framing_rule,'FRAMING',1500)+'\n'+
       ngdVisualConfigString_(tpl.safe_zone_rule,'TEMPLATE_SAFE_ZONE',1000)},
    {id:'05_WORLD_CLASS_QUALITY',
     text:ngdVisualConfigString_(r.guardrails.positive,'QUALITY_POSITIVE',1600)+'\n'+
       ngdVisualConfigString_(quality.positive_skill,'QUALITY_TIER',1200)}
  ];
  var neg=[
    ngdVisualConfigString_(r.guardrails.negative,'QUALITY_NEGATIVE',1600),
    ngdVisualConfigString_(tpl.negative_lock,'TEMPLATE_NEGATIVE',1200)
  ];
  if(mood.negative_lock!==undefined){
    neg.push(ngdVisualConfigString_(mood.negative_lock,'MOOD_NEGATIVE',900));
  }
  ngdVisualRequire_(typeof quality.adapter_profile==='string'&&
    /^[a-z][a-z0-9_-]{1,50}$/.test(quality.adapter_profile),
    'QUALITY_ADAPTER_PROFILE_INVALID');
  var overlaySpec={
    // Text, price and CTA are passed to a trusted deterministic compositor.
    product_name:input.overlay.product_name,
    promo_text:input.overlay.promo_text,
    price:input.overlay.price,
    cta:input.overlay.cta,
    currency:'IDR',
    safe_zone:safe,
    layout_id:ngdVisualConfigString_(tpl.overlay_preset,'OVERLAY_PRESET',100),
    canvas:{width:w,height:h},
    text_rendering:'DETERMINISTIC_CANVAS_ONLY'
  };
  // No separate "model text" is emitted for the overlay (Layer 6).
  return {
    compiler_version:NGD_VISUAL_COMPILER_VERSION_,
    skill_version:r.version,
    option_ids:ids,
    compiled_prompt:layers.map(function(l){return l.text;}).join('\n\n'),
    negative_prompt:neg.join('\n'),
    layer_trace:layers.map(function(l){return l.id;}),
    overlay_specification:overlaySpec,
    provider_adapter_profile:quality.adapter_profile,
    media_contract:{
      reference_asset_id:input.media.reference_asset_id,
      storage_backend:'PRIVATE_MEDIA_ADAPTER',
      delivery:'REFERENCE_HANDLE_ONLY',
      max_direct_payload_bytes:0
    },
    request_id:input.request_id
  };
}

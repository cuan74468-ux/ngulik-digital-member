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
    badge_text:input.overlay.badge_text,
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


/**
 * Tool #1 V2 Img2Img compiler. Its ONLY permitted image generation mode is
 * reference-conditioned reconstruction. The private registry must contain
 * explicit denoise, deblur, relight, background replacement, and strict brand
 * preservation instructions. Model compliance requires later visual QA.
 */
function ngdVisualV2Entry_(registry,group,id){
  ngdVisualRequire_(ngdVisualOwn_(registry[group],id),
    'V2_SKILL_'+group.toUpperCase()+'_MISSING');
  return registry[group][id];
}
function ngdVisualV2Skill_(value,label){
  return ngdVisualConfigString_(value,'V2_'+label,2200);
}
function ngdVisualCompilePromptV2_(payload,registryOverride){
  var input=ngdVisualInputV2_(payload);
  var registry=ngdVisualPrivateRegistryV2_(
    registryOverride||ngdVisualLoadPrivateSkillsV2_());
  var id=input.ids;
  var category=ngdVisualV2Entry_(registry,'categories',id.product_category);
  var style=ngdVisualV2Entry_(registry,'styles',id.visual_style);
  var use=ngdVisualV2Entry_(registry,'use_cases',id.use_case);
  var angle=ngdVisualV2Entry_(registry,'camera_angles',id.camera_angle);
  var light=ngdVisualV2Entry_(registry,'lighting_moods',id.lighting_mood);
  var ratio=ngdVisualV2Entry_(registry,'ratios',id.aspect_ratio);
  var quality=ngdVisualV2Entry_(registry,'qualities',id.quality_tier);
  ngdVisualRequire_(ngdVisualIsPlain_(style)&&
    Array.isArray(style.compatible_categories)&&
    style.compatible_categories.indexOf(id.product_category)>=0,
    'V2_STYLE_CATEGORY_INCOMPATIBLE');
  ngdVisualRequire_(ngdVisualIsPlain_(use)&&
    ngdVisualIsPlain_(ratio)&&ngdVisualIsPlain_(quality),
    'V2_SKILL_SHAPE_INVALID');
  var pixel=ratio.canvas;
  ngdVisualRequire_(ngdVisualIsPlain_(pixel)&&
    Number.isSafeInteger(pixel.width)&&pixel.width>=256&&pixel.width<=8192&&
    Number.isSafeInteger(pixel.height)&&pixel.height>=256&&pixel.height<=8192,
    'V2_CANVAS_INVALID');
  var expected={'1:1':1,'4:5':4/5,'9:16':9/16,'16:9':16/9}[id.aspect_ratio];
  ngdVisualRequire_(Math.abs(pixel.width/pixel.height-expected)<0.01,
    'V2_CANVAS_RATIO_INVALID');
  var safe=ngdVisualSafeZone_(use.safe_zone);
  var inputCondition=registry.input_conditioning;
  var preservation=registry.preservation;
  var layer1=[
    ngdVisualV2Skill_(inputCondition.denoise_deblur,'DENOISE_DEBLUR'),
    ngdVisualV2Skill_(inputCondition.relight,'RELIGHT'),
    ngdVisualV2Skill_(inputCondition.background_rebuild,'BACKGROUND_REBUILD'),
    ngdVisualV2Skill_(preservation.geometry,'GEOMETRY'),
    ngdVisualV2Skill_(preservation.brand_color,'BRAND_COLOR'),
    ngdVisualV2Skill_(preservation.label_integrity,'LABEL_INTEGRITY')
  ].join('\n');
  var layers=[
    {id:'01_INPUT_CONDITIONING_AND_PRESERVATION',text:layer1},
    {id:'02_MATERIAL_AND_ART_DIRECTION',
      text:ngdVisualV2Skill_(category,'CATEGORY')+'\n'+
        ngdVisualV2Skill_(style.skill,'STYLE')},
    {id:'03_CAMERA_AND_LIGHTING',
      text:ngdVisualV2Skill_(angle,'ANGLE')+'\n'+
        ngdVisualV2Skill_(light,'LIGHT')},
    {id:'04_USE_CASE_FRAMING_AND_RATIO',
      text:ngdVisualV2Skill_(use.skill,'USE_CASE')+'\n'+
        ngdVisualV2Skill_(ratio.framing,'RATIO')},
    {id:'05_QUALITY_AND_NEGATIVE_LOCK',
      text:ngdVisualV2Skill_(quality.skill,'QUALITY')+'\n'+
        ngdVisualV2Skill_(registry.guardrails.positive,'POSITIVE')}
  ];
  var negative=[
    ngdVisualV2Skill_(registry.guardrails.negative,'NEGATIVE'),
    ngdVisualV2Skill_(preservation.negative,'PRESERVATION_NEGATIVE')
  ];
  if(style.negative!==undefined)
    negative.push(ngdVisualV2Skill_(style.negative,'STYLE_NEGATIVE'));
  ngdVisualRequire_(typeof quality.adapter_profile==='string'&&
    /^[a-z][a-z0-9_-]{1,50}$/.test(quality.adapter_profile),
    'V2_PROFILE_INVALID');
  var overlay={
    enabled:input.overlay.enabled,
    text_rendering:'DETERMINISTIC_CANVAS_ONLY',
    product_name:input.overlay.product_name,
    promo_text:input.overlay.promo_text,
    badge_text:input.overlay.badge_text,
    price:input.overlay.price,
    cta:input.overlay.cta,
    currency:'IDR',
    safe_zone:safe,
    canvas:{width:pixel.width,height:pixel.height}
  };
  return {
    contract_version:'visual-img2img-v2',
    skill_version:registry.version,
    image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',
    request_id:input.request_id,
    option_ids:id,
    compiled_prompt:layers.map(function(l){return l.text;}).join('\n\n'),
    negative_prompt:negative.join('\n'),
    layer_trace:layers.map(function(l){return l.id;}),
    overlay_specification:overlay,
    provider_adapter_profile:quality.adapter_profile,
    media_contract:{
      reference_asset_id:input.reference_asset_id,
      requires_trusted_asset_ownership:true,
      requires_image_conditioning:true,
      no_text_to_image_fallback:true,
      storage_backend:'PRIVATE_MEDIA_ADAPTER'
    },
    release_authorized:false
  };
}


/**
 * Companion to the canonical V2 Img2Img compiler. Exact 12-slot private
 * skill content comes from the private registry, not frontend controls.
 * 08 is an immutable code-level *no text* instruction. Layer 12 can only
 * select a trusted private enum skill; free text never reaches the provider.
 */
function ngdVisualCompileRecipe12_(payload,registryOverride){
  var input=ngdVisualRecipe12Options_(payload);
  var registry=ngdVisualValidateRecipe12Registry_(
    registryOverride||ngdVisualLoadPrivateSkillsV2_());
  var canonicalPayload={};
  Object.keys(payload).forEach(function(k){
    if(['result_count','optional_notes','optional_skill_id'].indexOf(k)<0)
      canonicalPayload[k]=payload[k];
  });
  var base=ngdVisualCompilePromptV2_(canonicalPayload,registry);
  var slots=registry.recipe12.layers.map(function(layer){
    return {slot:layer.slot,
      // 08 is always compiler-owned and must not be replaced by user text.
      text:layer.slot==='08'?NGD_VISUAL_TEXT_LOCK_:layer.skill};
  });
  var selectedSkill=registry.recipe12.optional_skills[input.optional_skill_id];
  var last=slots[11];
  last.text+='\n'+selectedSkill;
  var output=slots.map(function(x){return '['+x.slot+']\n'+x.text;}).join('\n\n');
  // Mandatory V2 safeguards survive adding the extra private layers.
  output+='\n\n[INPUT_CONDITIONING_AND_PRESERVATION]\n'+
    base.compiled_prompt;
  ngdVisualRequire_(output.length<=16000,'RECIPE12_COMPILED_TOO_LONG');
  // The fixed lock is also enforced in negative constraints (not rendered).
  var negative=base.negative_prompt+
    '\nNo generated typography, no letters, no numbers, no watermark.';
  return {
    contract_version:'visual-img2img-v2',
    recipe_version:NGD_VISUAL_RECIPE12_VERSION_,
    skill_version:registry.version,
    image_generation_mode:'IMAGE_TO_IMAGE_REQUIRED',
    option_ids:base.option_ids,
    request_id:base.request_id,
    result_count:input.result_count,
    compiled_prompt:output,
    negative_prompt:negative,
    layer_trace:slots.map(function(x){return x.slot;}),
    overlay_specification:base.overlay_specification,
    media_contract:base.media_contract,
    provider_adapter_profile:base.provider_adapter_profile,
    // Real cost requires a server-side pricing quote, never browser math.
    cost_contract:{
      multiplier:input.result_count,
      price_quoted_by_backend:false,
      reserve_once_per_idempotent_request:true
    },
    free_text_discarded:true,
    release_authorized:false
  };
}

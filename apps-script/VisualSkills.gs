/**
 * P1 Tool #1 — private skill registry loader and strict public-option contract.
 * This file intentionally contains NO master prompt recipes or provider keys.
 * Private registry JSON lives in Apps Script Script Properties, NOT in GitHub.
 * No doGet/doPost action is registered by these helpers.
 */
var NGD_VISUAL_COMPILER_VERSION_ = 'visual-compiler-v1';
var NGD_VISUAL_REGISTRY_PROPERTY_ = 'NGD_VISUAL_SKILL_REGISTRY_V1';
var NGD_VISUAL_ALLOWED_OPTIONS_ = Object.freeze({
  template_id:['food_promo','catalog_clean','lifestyle','poster_promo','skincare_podium','dark_luxury','story_vertical'],
  category_id:['culinary','product','lifestyle','promotion'],
  mood_id:['warm_appetite','clean_neutral','editorial','dramatic'],
  lighting_id:['soft_window','softbox','daylight','studio_rim'],
  ratio_id:['1:1','4:5','9:16','16:9'],
  quality_tier:['economy','standard','premium']
});

function ngdVisualRequire_(ok,code) {
  if(!ok)throw new Error('VISUAL_'+code);
}
function ngdVisualIsPlain_(value) {
  return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
}
function ngdVisualOwn_(obj,key) {
  return ngdVisualIsPlain_(obj)&&Object.prototype.hasOwnProperty.call(obj,key);
}
function ngdVisualOption_(payload,field) {
  ngdVisualRequire_(ngdVisualOwn_(payload,field),'OPTION_'+field.toUpperCase()+'_MISSING');
  var id=payload[field];
  ngdVisualRequire_(typeof id==='string'&&
    NGD_VISUAL_ALLOWED_OPTIONS_[field].indexOf(id)>=0,'OPTION_'+field.toUpperCase()+'_INVALID');
  return id;
}
function ngdVisualText_(value,max,field) {
  if(value===undefined||value===null)return '';
  ngdVisualRequire_(typeof value==='string','OVERLAY_'+field.toUpperCase()+'_TYPE');
  var result=value.replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim();
  ngdVisualRequire_(result.length<=max,'OVERLAY_'+field.toUpperCase()+'_LENGTH');
  return result;
}
function ngdVisualInput_(input) {
  ngdVisualRequire_(ngdVisualIsPlain_(input),'PAYLOAD_INVALID');
  var allowed=['template_id','category_id','mood_id','lighting_id','ratio_id',
    'quality_tier','product_name','promo_text','badge_text','price','cta','reference_image','request_id'];
  Object.keys(input).forEach(function(key){
    ngdVisualRequire_(allowed.indexOf(key)>=0,'PAYLOAD_UNKNOWN_FIELD');
  });
  var ids={};
  ['template_id','category_id','mood_id','lighting_id','ratio_id','quality_tier']
    .forEach(function(field){ids[field]=ngdVisualOption_(input,field);});
  var price=input.price;
  ngdVisualRequire_(price===null||price===undefined||
    (typeof price==='number'&&Number.isSafeInteger(price)&&price>=0&&price<=100000000),
    'OVERLAY_PRICE_INVALID');
  var ref=input.reference_image==null?'':input.reference_image;
  ngdVisualRequire_(typeof ref==='string'&&
    (ref===''||/^asset_[A-Za-z0-9_-]{6,80}$/.test(ref)),'REFERENCE_ID_INVALID');
  var requestId=input.request_id==null?'':input.request_id;
  ngdVisualRequire_(typeof requestId==='string'&&
    (requestId===''||/^[A-Za-z0-9_-]{16,80}$/.test(requestId)),'REQUEST_ID_INVALID');
  return {
    ids:ids,
    overlay:{
      product_name:ngdVisualText_(input.product_name,100,'product_name'),
      promo_text:ngdVisualText_(input.promo_text,160,'promo_text'),
      badge_text:ngdVisualText_(input.badge_text,60,'badge_text'),
      price:price==null?null:price,
      cta:ngdVisualText_(input.cta,60,'cta')
    },
    media:{reference_asset_id:ref},
    request_id:requestId
  };
}
function ngdVisualConfigString_(value,label,max) {
  ngdVisualRequire_(typeof value==='string'&&value.trim().length>=3&&
    value.length<=max,'REGISTRY_'+label+'_INVALID');
  return value.trim();
}
function ngdVisualPrivateRegistry_(registry) {
  ngdVisualRequire_(ngdVisualIsPlain_(registry),'REGISTRY_OBJECT_INVALID');
  ngdVisualConfigString_(registry.version,'VERSION',80);
  var groups=['preservation','templates','moods','lighting','ratios','qualities'];
  groups.forEach(function(group){
    ngdVisualRequire_(ngdVisualIsPlain_(registry[group]),'REGISTRY_'+group.toUpperCase()+'_INVALID');
  });
  ngdVisualRequire_(ngdVisualIsPlain_(registry.guardrails),'REGISTRY_GUARDRAILS_INVALID');
  ngdVisualConfigString_(registry.guardrails.positive,'QUALITY_POSITIVE',1600);
  ngdVisualConfigString_(registry.guardrails.negative,'QUALITY_NEGATIVE',1600);
  return registry;
}
function ngdVisualLoadPrivateSkills_() {
  // Limit Script Properties to a small bootstrap registry (typically < 9 kB).
  // Larger registries can be loaded by a PRIVATE backend-owned vault in the future.
  ngdVisualRequire_(typeof PropertiesService!=='undefined','REGISTRY_PRIVATE_BACKEND_REQUIRED');
  var raw=PropertiesService.getScriptProperties().getProperty(NGD_VISUAL_REGISTRY_PROPERTY_);
  ngdVisualRequire_(typeof raw==='string'&&raw.length>0&&raw.length<=9000,
    'REGISTRY_PRIVATE_NOT_CONFIGURED');
  var parsed;
  try{parsed=JSON.parse(raw);}catch(_){throw new Error('VISUAL_REGISTRY_JSON_INVALID');}
  return ngdVisualPrivateRegistry_(parsed);
}


/**
 * Tool #1 authoritative V2 Img2Img contract. V1 remains for legacy
 * regression only; do not dispatch its prompt to a provider for Tool #1.
 * No skills/prompts are included here. All recipe content stays in
 * private, versioned backend registry NGD_VISUAL_SKILL_REGISTRY_V2.
 */
var NGD_VISUAL_V2_REGISTRY_PROPERTY_='NGD_VISUAL_SKILL_REGISTRY_V2';
var NGD_VISUAL_V2_OPTIONS_=Object.freeze({
  product_category:['food_culinary','beverage_bottle','skincare_cosmetic','fashion_craft','general_retail'],
  visual_style:['studio_clean','splash_levitation','dark_mirror_splash','dark_action_drop','bright_lifestyle_table','moody_nature_wood'],
  use_case:['marketplace_main','social_feed','story_reels_wa','promo_banner'],
  camera_angle:['eye_level','hero_45','macro_closeup','flatlay_top'],
  lighting_mood:['soft_daylight','warm_appetizing','dramatic_rim','crisp_commercial'],
  aspect_ratio:['1:1','4:5','9:16','16:9'],
  quality_tier:['standard','hd_commercial']
});
function ngdVisualInputV2_(payload){
  ngdVisualRequire_(ngdVisualIsPlain_(payload),'V2_PAYLOAD_INVALID');
  var accepted=Object.keys(NGD_VISUAL_V2_OPTIONS_).concat([
    'reference_image','request_id','overlay_enabled','product_name','promo_text',
    'badge_text','price','cta'
  ]);
  Object.keys(payload).forEach(function(k){
    ngdVisualRequire_(accepted.indexOf(k)>=0,'V2_UNKNOWN_FIELD');
  });
  var ids={};
  Object.keys(NGD_VISUAL_V2_OPTIONS_).forEach(function(field){
    ngdVisualRequire_(ngdVisualOwn_(payload,field)&&
      typeof payload[field]==='string'&&
      NGD_VISUAL_V2_OPTIONS_[field].indexOf(payload[field])>=0,
      'V2_OPTION_'+field.toUpperCase()+'_INVALID');
    ids[field]=payload[field];
  });
  var ref=payload.reference_image;
  ngdVisualRequire_(typeof ref==='string'&&
    /^asset_[A-Za-z0-9_-]{6,80}$/.test(ref),
    'V2_REFERENCE_IMAGE_REQUIRED');
  ngdVisualRequire_(typeof payload.request_id==='string'&&
    /^[A-Za-z0-9_-]{16,80}$/.test(payload.request_id),
    'V2_REQUEST_ID_REQUIRED');
  ngdVisualRequire_(payload.overlay_enabled===undefined||
    typeof payload.overlay_enabled==='boolean','V2_OVERLAY_FLAG_INVALID');
  var enabled=payload.overlay_enabled===true;
  var price=payload.price;
  ngdVisualRequire_(price==null||(typeof price==='number'&&
    Number.isSafeInteger(price)&&price>=0&&price<=100000000),
    'V2_PRICE_INVALID');
  var overlay={
    enabled:enabled,
    product_name:ngdVisualText_(payload.product_name,100,'product_name'),
    promo_text:ngdVisualText_(payload.promo_text,160,'promo_text'),
    badge_text:ngdVisualText_(payload.badge_text,60,'badge_text'),
    price:price==null?null:price,
    cta:ngdVisualText_(payload.cta,60,'cta')
  };
  // User text is overlay-only. Never interpolate any field into Img2Img prompt.
  return {ids:ids,reference_asset_id:ref,request_id:payload.request_id,overlay:overlay};
}
function ngdVisualPrivateRegistryV2_(value){
  ngdVisualRequire_(ngdVisualIsPlain_(value),'V2_REGISTRY_INVALID');
  ngdVisualRequire_(typeof value.version==='string'&&
    /^visual-skills-v2[._-][A-Za-z0-9._-]{1,70}$/.test(value.version),
    'V2_REGISTRY_VERSION_INVALID');
  ['input_conditioning','preservation','categories','styles','use_cases',
   'camera_angles','lighting_moods','ratios','qualities','guardrails']
    .forEach(function(k){
      ngdVisualRequire_(ngdVisualIsPlain_(value[k]),
        'V2_REGISTRY_GROUP_'+k.toUpperCase()+'_INVALID');
    });
  return value;
}
function ngdVisualLoadPrivateSkillsV2_(){
  ngdVisualRequire_(typeof PropertiesService!=='undefined',
    'V2_PRIVATE_BACKEND_REQUIRED');
  var raw=PropertiesService.getScriptProperties().getProperty(
    NGD_VISUAL_V2_REGISTRY_PROPERTY_);
  ngdVisualRequire_(typeof raw==='string'&&raw.length>0&&
    raw.length<=9000,'V2_PRIVATE_REGISTRY_MISSING');
  var decoded;
  try{decoded=JSON.parse(raw);}catch(_){throw new Error('VISUAL_V2_REGISTRY_JSON_INVALID');}
  return ngdVisualPrivateRegistryV2_(decoded);
}


/* Food Magazine V2: PUBLIC IDs only. Actual English recipes remain in the
 * PRIVATE NGD_VISUAL_FOOD_MAGAZINE_V2 registry, never returned to a client. */
var NGD_FOOD_MAGAZINE_REGISTRY_KEY_='NGD_VISUAL_FOOD_MAGAZINE_V2';
var NGD_FOOD_MAGAZINE_IDS_=Object.freeze({
 food_type:['soup','rice','bakery','snack','drink','dessert'],
 cover_concept:['classic','minimal','hero','flatlay','dramatic','bright','warung','fine_dining'],
 camera_angle:['top90','angle45','eye','macro','diagonal','low'],
 lighting:['window','golden','side','softbox','backlight','candle'],
 surface:['dark_wood','white_marble','concrete','bamboo','linen','plain_white'],
 grade:['warm','cool','earthy','vivid','matte','brand'],
 styling:['minimal','ingredients','steam','sauce','sprinkle','hand'],
 lens:['mm35','mm50','mm85','macro100'],
 format:['4:5','1:1','9:16','3:4'],
 similarity:['exact','enhanced']
});
var NGD_FOOD_MAGAZINE_PRESETS_=Object.freeze({
 classic:{lighting:'golden',surface:'dark_wood',grade:'warm'},
 minimal:{lighting:'softbox',surface:'white_marble',grade:'matte'},
 hero:{lighting:'side',surface:'concrete',grade:'vivid'},
 flatlay:{lighting:'window',surface:'linen',grade:'earthy'},
 dramatic:{lighting:'side',surface:'dark_wood',grade:'earthy'},
 bright:{lighting:'window',surface:'white_marble',grade:'vivid'},
 warung:{lighting:'window',surface:'bamboo',grade:'warm'},
 fine_dining:{lighting:'softbox',surface:'concrete',grade:'cool'}
});
function ngdFoodMagazineCompatible_(ids){
 return !(ids.cover_concept==='dramatic'&&ids.surface==='plain_white')&&
   !(ids.cover_concept==='bright'&&ids.lighting==='candle')&&
   !(ids.camera_angle==='top90'&&ids.styling==='steam');
}
function ngdFoodMagazineInput_(payload){
 ngdVisualRequire_(ngdVisualIsPlain_(payload),'FOOD_PAYLOAD_INVALID');
 var allowed=Object.keys(NGD_FOOD_MAGAZINE_IDS_).concat([
  'overlay_enabled','brand_name','headline','tagline','price_label',
  'brand_hex','user_notes','count','reference_image','request_id','credit_per_image'
 ]);
 Object.keys(payload).forEach(function(k){ngdVisualRequire_(
   allowed.indexOf(k)>=0,'FOOD_UNKNOWN_FIELD');});
 var ids={};
 Object.keys(NGD_FOOD_MAGAZINE_IDS_).forEach(function(k){
  ngdVisualRequire_(ngdVisualOwn_(payload,k)&&
   typeof payload[k]==='string'&&
   NGD_FOOD_MAGAZINE_IDS_[k].indexOf(payload[k])>=0,'FOOD_OPTION_'+k.toUpperCase()+'_INVALID');
  ids[k]=payload[k];
 });
 ngdVisualRequire_(ngdFoodMagazineCompatible_(ids),'FOOD_COMBINATION_CONFLICT');
 var count=payload.count===undefined?1:payload.count;
 ngdVisualRequire_(count===1||count===2||count===4,'FOOD_COUNT_INVALID');
 ngdVisualRequire_(payload.overlay_enabled===undefined||
   typeof payload.overlay_enabled==='boolean','FOOD_OVERLAY_FLAG_INVALID');
 var hex=payload.brand_hex===undefined?'':payload.brand_hex;
 ngdVisualRequire_(typeof hex==='string'&&
  (hex===''||/^#[0-9a-fA-F]{6}$/.test(hex)),'FOOD_BRAND_HEX_INVALID');
 ngdVisualRequire_(ids.grade!=='brand'||hex!=='','FOOD_BRAND_HEX_REQUIRED');
 ngdVisualRequire_(typeof payload.reference_image==='string'&&
  /^asset_[A-Za-z0-9_-]{6,80}$/.test(payload.reference_image),'FOOD_REFERENCE_REQUIRED');
 ngdVisualRequire_(typeof payload.request_id==='string'&&
  /^[A-Za-z0-9_-]{16,80}$/.test(payload.request_id),'FOOD_REQUEST_ID_INVALID');
 // Client-estimated credit is never authoritative for actual billing.
 ngdVisualRequire_(payload.credit_per_image===undefined,'FOOD_CLIENT_CREDIT_FORBIDDEN');
 var notes=ngdVisualText_(payload.user_notes,240,'food_notes');
 ngdVisualRequire_(!/(ignore (all |previous |prior )?instructions|system prompt|developer message|role:|api[_ -]?key|secret|password)/i.test(notes),
  'FOOD_NOTES_UNSAFE');
 return {ids:ids,count:count,brand_hex:hex,user_notes:notes,
  reference_asset_id:payload.reference_image,request_id:payload.request_id,
  overlay:{enabled:payload.overlay_enabled===true,
   brand_name:ngdVisualText_(payload.brand_name,70,'brand'),
   headline:ngdVisualText_(payload.headline,100,'headline'),
   tagline:ngdVisualText_(payload.tagline,100,'tagline'),
   price_label:ngdVisualText_(payload.price_label,30,'price_label')}};
}
function ngdFoodMagazinePrivateRegistry_(r){
 ngdVisualRequire_(ngdVisualIsPlain_(r)&&
  typeof r.version==='string'&&/^food-magazine-v2[._-][A-Za-z0-9._-]{1,50}$/.test(r.version),
  'FOOD_REGISTRY_VERSION_INVALID');
 ['role','preservation','food_type','cover_concept','camera_angle',
  'lighting','surface','grade','styling','lens','format','similarity',
  'quality','negative'].forEach(function(k){
  ngdVisualRequire_(typeof r[k]==='string'||ngdVisualIsPlain_(r[k]),
   'FOOD_REGISTRY_'+k.toUpperCase()+'_INVALID');
 });
 return r;
}
function ngdFoodMagazinePrivateRegistryLoad_(){
 ngdVisualRequire_(typeof PropertiesService!=='undefined','FOOD_PRIVATE_BACKEND_REQUIRED');
 var raw=PropertiesService.getScriptProperties().getProperty(NGD_FOOD_MAGAZINE_REGISTRY_KEY_);
 ngdVisualRequire_(typeof raw==='string'&&raw.length>0&&raw.length<=9000,
  'FOOD_PRIVATE_REGISTRY_NOT_CONFIGURED');
 var value;
 try{value=JSON.parse(raw);}catch(_){throw Error('VISUAL_FOOD_REGISTRY_JSON_INVALID');}
 return ngdFoodMagazinePrivateRegistry_(value);
}

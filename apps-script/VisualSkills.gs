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

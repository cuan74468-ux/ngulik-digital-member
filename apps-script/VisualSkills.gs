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
// Server-side baseline skill lock. Public source contains generic professional
// constraints, not the operator's private recipe registry or credentials.
// The selected scenario has precedence over incompatible optional optics.
var NGD_FOOD_PHOTO_LOCKS_=Object.freeze({
 food_type:Object.freeze({
  soup:'Retain the actual bowl, broth level and portions; natural sheen and steam only for genuinely hot food.',
  rice:'Retain real grain structure, mound, sides and portions; no invented garnish.',
  bakery:'Show actual crumb and crust with controlled highlights; never invent fillings.',
  snack:'Resolve genuine crisp texture and original count; no artificial coating or extra pieces.',
  drink:'Retain true liquid hue, opacity, level, container and cap; realistic refraction.',
  dessert:'Retain actual layers, decoration and portion; accurate soft textures without invented toppings.'
 }),
 cover_concept:Object.freeze({
  classic:'Balanced commercial hero composition with uncluttered setting.',
  minimal:'Sparse set with one clear subject and deliberate negative space.',
  hero:'Dominant product silhouette, no competing objects or misleading scale.',
  flatlay:'Orderly overhead composition only where source geometry supports it.',
  dramatic:'Low-key surroundings with readable product edges and label.',
  bright:'High-key surroundings, protected highlights and true product color.',
  warung:'Authentic clean Indonesian small-business setting, restrained props.',
  fine_dining:'Refined uncluttered editorial setting; preserve actual serving and quantity.'
 }),
 camera_angle:Object.freeze({
  top90:'Overhead framing only if compatible with the locked scenario and source.',
  angle45:'Natural three-quarter perspective, no stretched geometry.',
  eye:'Eye-level perspective, straight verticals and visible label.',
  macro:'Close detail without sacrificing the recognizability of the whole product.',
  diagonal:'Subtle diagonal composition, not distorted product perspective.',
  low:'Low angle only when it does not obscure or distort the original product.'
 }),
 lighting:Object.freeze({
  window:'Diffused window key and gentle fill, natural color.',
  golden:'Warm background light without recoloring the product.',
  side:'Controlled lateral key revealing true texture.',
  softbox:'Large diffused studio key with restrained specular highlights.',
  backlight:'Rim light behind subject, preserve label readability.',
  candle:'Warm low-key practical ambience without darkening product details.'
 }),
 surface:Object.freeze({
  dark_wood:'Matte dark wood with physically grounded shadows.',
  white_marble:'Clean pale stone, subtle veins outside the subject.',
  concrete:'Neutral mineral surface with restrained texture.',
  bamboo:'Authentic clean bamboo surface; do not obscure product.',
  linen:'Natural neutral fabric, no competing patterns.',
  plain_white:'Seamless neutral white background and soft contact shadow.'
 }),
 grade:Object.freeze({
  warm:'Warm surroundings, retain original product and label hues.',
  cool:'Cool surroundings, retain original product and label hues.',
  earthy:'Muted natural tones, accurate product colors.',
  vivid:'Controlled contrast and saturation, no clipping or color distortion.',
  matte:'Gentle highlight roll-off and natural blacks, not washed out.',
  brand:'Preserve reference brand palette; no invented logos or recoloring.'
 }),
 styling:Object.freeze({
  minimal:'No additional decoration unless required by the selected scenario.',
  ingredients:'Only visually confirmed ingredients; no invented contents.',
  steam:'Thin physically plausible steam only for hot food, never over a label.',
  sauce:'Show only existing sauce and true quantity.',
  sprinkle:'Only confirmed original topping material, never obscuring subject.',
  hand:'Do not invent a hand or model; preserve a hand only if present in reference.'
 }),
 lens:Object.freeze({
  mm35:'Natural wider context, straight lines without edge stretching.',
  mm50:'Natural commercial perspective with controlled depth of field.',
  mm85:'Compressed product perspective and clean separation from background.',
  macro100:'Resolve true surface detail, preserve full identity and readable label.'
 }),
 format:Object.freeze({
  '4:5':'Portrait 4:5, protect entire product and breathing room.',
  '1:1':'Square 1:1, center balanced product and clear margins.',
  '9:16':'Vertical 9:16, preserve full product within story-safe central region.',
  '3:4':'Portrait 3:4, preserve full product and proportional framing.'
 }),
 similarity:Object.freeze({
  exact:'Strict source fidelity: never alter SKU, label, material, geometry or quantity.',
  enhanced:'Enhance only lighting, texture visibility and background; same strict product identity.'
 })
});
function ngdFoodPhotoLockedSkill_(group,id){
 ngdVisualRequire_(ngdVisualOwn_(NGD_FOOD_PHOTO_LOCKS_,group)&&
  ngdVisualOwn_(NGD_FOOD_PHOTO_LOCKS_[group],id),'FOOD_LOCKED_SKILL_MISSING');
 return NGD_FOOD_PHOTO_LOCKS_[group][id];
}

function ngdFoodMagazineCompatible_(ids){
 return !(ids.cover_concept==='dramatic'&&ids.surface==='plain_white')&&
   !(ids.cover_concept==='bright'&&ids.lighting==='candle')&&
   !(ids.camera_angle==='top90'&&ids.styling==='steam');
}
function ngdFoodMagazineInput_(payload){
 ngdVisualRequire_(ngdVisualIsPlain_(payload),'FOOD_PAYLOAD_INVALID');
 var allowed=Object.keys(NGD_FOOD_MAGAZINE_IDS_).concat([
  'overlay_enabled','brand_name','headline','tagline','price_label',
  'brand_hex','user_notes','count','reference_image','request_id','credit_per_image',
  'product_category','studio_scenario','restoration_mode'
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
 var type=payload.product_category;
 if(type!==undefined){
  ngdVisualRequire_(type!=='hot_soupy_food'||ids.food_type==='soup','CONTEXT_FOOD_TYPE_MISMATCH');
  ngdVisualRequire_(type!=='bottled_liquid'||ids.food_type==='drink','CONTEXT_FOOD_TYPE_MISMATCH');
  ngdVisualRequire_(type!=='bakery_snack'||
   ['bakery','snack','dessert'].indexOf(ids.food_type)>=0,
   'CONTEXT_FOOD_TYPE_MISMATCH');
 }
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
 ngdVisualRequire_(!/(ignore (all |previous |prior )?instructions|system prompt|developer message|role:|api[_ -]?key|secret|password|abaikan (semua |instruksi |aturan )|lupakan (instruksi|aturan)|ganti (prompt|instruksi)|bocorkan|kata sandi|\[0[1-9]_|\[1[0-2]_)/i.test(notes),
  'FOOD_NOTES_UNSAFE');
 return {ids:ids,count:count,brand_hex:hex,user_notes:notes,
  context:ngdVisualContextInput_(payload),
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
 ['role','preservation','quality','negative'].forEach(function(k){
  ngdVisualConfigString_(r[k],'FOOD_REGISTRY_'+k.toUpperCase(),{role:1400,preservation:1700,quality:1600,negative:1800}[k]);
 });
 Object.keys(NGD_FOOD_MAGAZINE_IDS_).forEach(function(group){
  ngdVisualRequire_(ngdVisualIsPlain_(r[group]),'FOOD_REGISTRY_'+group.toUpperCase()+'_INVALID');
  NGD_FOOD_MAGAZINE_IDS_[group].forEach(function(id){
   ngdVisualRequire_(ngdVisualOwn_(r[group],id),'FOOD_REGISTRY_SKILL_MISSING');
   ngdVisualConfigString_(r[group][id],'FOOD_REGISTRY_SKILL',1500);
  });
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


/**
 * Published Visual machine catalogue (public-facing rates, not API costs).
 * Final quotes and reservations MUST be recalculated on the server.
 * No provider acquisition prices, margins or secrets in client responses.
 */
var NGD_VISUAL_MACHINE_CATALOG_=Object.freeze({
 gemini_flash_image:Object.freeze({id:'gemini_flash_image',
  name:'Hemat & Cepat',model:'Gemini 3.1 Flash Image',
  description:'Eksplorasi konsep kuliner dengan proses cepat.',
  credits_per_image:2,provider_group:'google'}),
 flux_kontext_pro:Object.freeze({id:'flux_kontext_pro',
  name:'Presisi Label & Kemasan',model:'FLUX.1 Kontext Pro',
  description:'Direkomendasikan untuk mempertahankan bentuk produk dan kemasan.',
  credits_per_image:3,provider_group:'flux'}),
 flux_2_pro:Object.freeze({id:'flux_2_pro',
  name:'Detail Komersial',model:'FLUX.2 Pro',
  description:'Detail tekstur untuk materi iklan utama.',
  credits_per_image:4,provider_group:'flux'})
});
function ngdVisualPublicCatalog_(){
 return ['gemini_flash_image','flux_kontext_pro','flux_2_pro'].map(function(id){
  var item=NGD_VISUAL_MACHINE_CATALOG_[id];
  return {id:item.id,name:item.name,model:item.model,
   description:item.description,credits_per_image:item.credits_per_image};
 });
}
function ngdVisualQuote_(machineId,count){
 ngdVisualRequire_(Object.prototype.hasOwnProperty.call(
  NGD_VISUAL_MACHINE_CATALOG_,machineId),'VISUAL_MACHINE_UNKNOWN');
 ngdVisualRequire_(count===1||count===2||count===4,'VISUAL_MACHINE_COUNT_INVALID');
 var unit=NGD_VISUAL_MACHINE_CATALOG_[machineId].credits_per_image;
 return Object.freeze({machine_id:machineId,unit_credits:unit,count:count,
  total_credits:unit*count,currency:'CREDIT',
  server_authoritative:true});
}


/* Studio Skill Matrix V1 — validated IDs select specific optical rules.
 * No client-written prompt fragments are accepted as scenario instructions.
 * Descriptions below are trusted backend source; optional user notes remain
 * untrusted/length-limited in the Food Magazine parser. */
var NGD_VISUAL_CONTEXT_SKILLS_=Object.freeze({
 hot_soupy_food:Object.freeze({
  steam_broth_hero:'Commercial 85mm close-focus, f/5.6, three-quarter 45-degree framing. Preserve original bowl shape, broth volume, meat texture and real toppings. A thin physically plausible steam plume rises behind the bowl, lit by a 135-degree rear rim-backlight; preserve translucent broth surface specular highlights and accurate food texture. No extra noodles, garnish, dumplings or imaginary side dishes.',
  warung_nusantara_modern:'50mm rectilinear lens, f/5.6, 45-degree hero bowl composition. Soft window key at camera-left and warm practical background bokeh, 2:1 key-to-fill. Natural glistening hot broth with restrained steam; authentic bamboo/wood warung context. Bowl, portions and ingredients exactly match the source image.',
  editorial_dark_bowl:'85mm lens, f/8, low-key editorial studio on dark charcoal; controlled grazing strip-light at 110 degrees and negative fill on opposite side. Keep bowl edge and protein sharply resolved, realistic broth oil sheen and a narrow rim-lit steam trace. No invented garnish.'
 }),
 bottled_liquid:Object.freeze({
  liquid_vortex_splash:'85mm rectilinear commercial lens, f/8, simulated high-speed 1/4000s frozen liquid helix behind the original bottle. Maintain original glass/plastic refractive index cues, honey amber or real liquid hue and opacity. Strong two-sided rim lighting, realistic splash continuity, believable fluid gravity and fine droplets. Enforce Label Safe Zone: no liquid, droplets, glare or graphics over original label, cap, brand logo or printed text.',
  obsidian_mirror_splash:'85mm rectilinear, f/8, simulated high-speed 1/4000s symmetrical amber liquid crown splash strictly BEHIND the bottle; dual rim lights at 120 and 240 degrees, controlled soft front fill, pure obsidian backdrop, black glossy acrylic base and optically coherent vertical mirror reflection. Preserve original bottle silhouette, cap, liquid color/opacity, orientation and existing label printing pixel-faithfully; Label Safe Zone is strictly unobstructed. No fake brand lettering.',
  chilled_condensation_studio:'85mm lens, f/8, cool softbox from upper-left, narrow rim from rear-right. Realistic tiny condensation beads physically attached to transparent container with clean controlled refraction, chilled tabletop contact shadow and muted cool neutral background. Do not change original product contents or brand text; keep label zone free from droplets and glare.'
 }),
 bakery_snack:Object.freeze({
  high_speed_topping_rain:'100mm macro lens, f/8, simulated 1/4000s high-speed strobe freeze of a sparse vertical rain of original edible toppings from above. Side-raking strip light at 70 degrees reveals fine bread crumb and crisp edges; falling bits never cover the main product identity or packaging label. Preserve authentic toppings and exact portion size.',
  macro_crumb_texture:'100mm macro lens, f/5.6, shallow but sufficient depth of field on genuine crumb and crust; 70-degree side-raking daylight and soft fill. Show porous soft center and crisp surface without fabricated filling, decorations or exaggerated material.',
  sunlit_cafe_marble:'50mm natural commercial lens, f/5.6, window sunlight at 45 degrees through diffusion, clean warm café marble, accurate contact shadow and natural highlight rolloff on original pastry or snack. Preserve product count and actual ingredient textures.'
 }),
 packaging_cosmetic:Object.freeze({
  clean_marketplace_cyclorama:'85mm rectilinear lens, f/11 for sharp packaging corners and label, shadowless off-white infinity cyclorama with softbox at 45 degrees and gentle grounded contact shadow. Preserve exact box edges, bottle silhouette, cap color, SKU print, every original logo/label character. Do not invent text.',
  podium_light_caustics:'85mm rectilinear lens, f/8, matte mineral podium with accurate grounded contact shadow. Controlled sun caustics refracted behind—not across—original package; side softbox + restrained rim, label fully visible and sharply preserved without warping.',
  volumetric_forest_pedestal:'85mm rectilinear lens, f/8, natural stone or wood plinth, diffuse forest green background and restrained volumetric god-rays behind the product, coherent contact shadow. Sharp original label and geometry preserved; no foliage obscuring brand/logo and no invented packaging text.'
 })
});
var NGD_VISUAL_CONTEXT_DEFAULTS_=Object.freeze({
 hot_soupy_food:'steam_broth_hero',
 bottled_liquid:'obsidian_mirror_splash',
 bakery_snack:'sunlit_cafe_marble',
 packaging_cosmetic:'clean_marketplace_cyclorama'
});
function ngdVisualContextSkill_(category,scenario){
 ngdVisualRequire_(typeof category==='string'&&
  Object.prototype.hasOwnProperty.call(NGD_VISUAL_CONTEXT_SKILLS_,category),
  'CONTEXT_CATEGORY_INVALID');
 var choices=NGD_VISUAL_CONTEXT_SKILLS_[category];
 ngdVisualRequire_(typeof scenario==='string'&&
  Object.prototype.hasOwnProperty.call(choices,scenario),'CONTEXT_SCENARIO_INVALID');
 return choices[scenario];
}
function ngdVisualContextInput_(payload){
 ngdVisualRequire_(ngdVisualIsPlain_(payload),'CONTEXT_PAYLOAD_INVALID');
 var category=payload.product_category===undefined?
  'hot_soupy_food':payload.product_category;
 var scenario=payload.studio_scenario===undefined?
  NGD_VISUAL_CONTEXT_DEFAULTS_[category]:payload.studio_scenario;
 var restoration=payload.restoration_mode===undefined?
  'full_phone_restoration':payload.restoration_mode;
 ngdVisualRequire_(restoration==='full_phone_restoration'||
  restoration==='preserve_source','CONTEXT_RESTORATION_INVALID');
 return {category:category,scenario:scenario,restoration:restoration,
  optics:ngdVisualContextSkill_(category,scenario)};
}
function ngdVisualContextPublicMatrix_(){
 return Object.keys(NGD_VISUAL_CONTEXT_SKILLS_).map(function(category){
  return {id:category,default_scenario:NGD_VISUAL_CONTEXT_DEFAULTS_[category],
   scenario_ids:Object.keys(NGD_VISUAL_CONTEXT_SKILLS_[category])};
 });
}

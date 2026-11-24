/**
 * Member-owned reusable Studio recipes. No photo bytes, arbitrary image URLs,
 * provider keys, private compiled prompts, or P0 credit data are stored.
 * The scenario/engine/rate always resolve through trusted backend registries.
 */
var NGD_VISUAL_TEMPLATE_MAX_PER_MEMBER_=20;
function ngdVisualTemplateValidate_(draft){
 ngdVisualRequire_(ngdVisualIsPlain_(draft),'TEMPLATE_PAYLOAD_INVALID');
 var allowed=['id','name','product_category','studio_scenario','restoration_mode',
  'format','machine_id','count','overlay_enabled','brand_name','headline',
  'tagline','price_label','brand_hex'];
 Object.keys(draft).forEach(function(key){
  ngdVisualRequire_(allowed.indexOf(key)>=0,'TEMPLATE_UNKNOWN_FIELD');
 });
 var category=draft.product_category,scenario=draft.studio_scenario;
 ngdVisualContextSkill_(category,scenario);
 ngdVisualQuote_(draft.machine_id,draft.count);
 ngdVisualRequire_(['4:5','1:1','9:16','3:4'].indexOf(draft.format)>=0,
  'TEMPLATE_FORMAT_INVALID');
 ngdVisualRequire_(['full_phone_restoration','preserve_source'].indexOf(draft.restoration_mode)>=0,
  'TEMPLATE_RESTORATION_INVALID');
 ngdVisualRequire_(typeof draft.overlay_enabled==='boolean','TEMPLATE_OVERLAY_INVALID');
 ngdVisualRequire_(draft.id===undefined||
  (typeof draft.id==='string'&&/^vt_[A-Za-z0-9_-]{12,50}$/.test(draft.id)),
  'TEMPLATE_ID_INVALID');
 var name=ngdVisualText_(draft.name,56,'template_name');
 ngdVisualRequire_(name.trim().length>=3&&!/[<>]/.test(name),'TEMPLATE_NAME_INVALID');
 var clean={
  name:name.trim(),product_category:category,studio_scenario:scenario,
  restoration_mode:draft.restoration_mode,format:draft.format,
  machine_id:draft.machine_id,count:draft.count,overlay_enabled:draft.overlay_enabled,
  brand_name:ngdVisualText_(draft.brand_name,70,'template_brand'),
  headline:ngdVisualText_(draft.headline,100,'template_headline'),
  tagline:ngdVisualText_(draft.tagline,100,'template_tagline'),
  price_label:ngdVisualText_(draft.price_label,30,'template_price')
 };
 clean.brand_hex=draft.brand_hex===undefined?'':draft.brand_hex;
 ngdVisualRequire_(typeof clean.brand_hex==='string'&&
  (clean.brand_hex===''||/^#[a-fA-F0-9]{6}$/.test(clean.brand_hex)),
  'TEMPLATE_HEX_INVALID');
 return clean;
}
function ngdVisualMemberTemplates_(auth,store){
 function user(token){return ngdVjSession_(auth,token);}
 return {
  list:function(token){return store.templates.list(user(token));},
  save:function(token,draft){
   var member=user(token),clean=ngdVisualTemplateValidate_(draft);
   return store.templates.save(member,draft.id||null,clean);
  },
  remove:function(token,id){return store.templates.remove(user(token),id);}
 };
}

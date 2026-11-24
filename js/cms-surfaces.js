/* Ngulik Digital editorial surface adapter.
 * Every commercial sentence comes from published site_content or public settings.
 * No fallback campaign, payment promises, commissions, or fictitious prices.
 */
(function(global){
 'use strict';
 const neutral='Sedang memuat informasi...';
 const aliases=Object.freeze({
  MEMBER_COPY:['MEMBER_GREETING'],PORTAL_NOTICE:['DISCLAIMER'],
  AFFILIATE_INFO:['NOTICE_BOX'],CHECKOUT_GUIDE:['CHECKOUT_COPY']
 });
 const h=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function row(items,id,kind,placement){
  return (Array.isArray(items)?items:[]).find(x=>x&&x.content_id===id&&
   (x.kind===kind||(aliases[kind]||[]).includes(x.kind))&&x.placement===placement&&
   (x.status===undefined||x.status==='PUBLISHED'))||null;
 }
 function field(items,id,kind,placement,key='title'){
  const r=row(items,id,kind,placement);
  return r?String(r[key]||''):neutral;
 }
 function inject(template,vars){
  return String(template||neutral).replace(/\{\{(nama|saldo_kredit|order_id|nama_produk|total_bayar)\}\}/g,
    (_,k)=>Object.prototype.hasOwnProperty.call(vars,k)?String(vars[k]):'');
 }
 function auth(items){
  return {
   title:field(items,'CNT-AUTH-INTRO','AUTH_COPY','auth'),
   description:field(items,'CNT-AUTH-INTRO','AUTH_COPY','auth','description'),
   label:(i)=>field(items,'CNT-AUTH-FIELD-'+String(i).padStart(2,'0'),'AUTH_FIELD','auth'),
   send:row(items,'CNT-AUTH-OTP-BUTTON','CTA_BUTTON','auth')
     ?field(items,'CNT-AUTH-OTP-BUTTON','CTA_BUTTON','auth','cta_label')
     :field(items,'CNT-AUTH-INTRO','AUTH_COPY','auth','cta_label'),
   submit:field(items,'CNT-AUTH-LOGIN-BUTTON','CTA_BUTTON','auth','cta_label')
  };
 }
 function memberHome(items,context){
  const r=row(items,'CNT-MEMBER-WELCOME','MEMBER_COPY','member_home');
  const name=String(context?.name||'').slice(0,80);
  const welcome=r?inject(r.title,{nama:name}):neutral;
  const routes=['ai','portal','katalog','affiliate'];
  const allowedRoutes=new Set(['ai','portal','katalog','affiliate','belajar','jasa','dukungan']);
  const cards=[1,2,3,4].map(i=>{
   const d=row(items,'CNT-MEMBER-CARD-'+String(i).padStart(2,'0'),'MEMBER_CARD','member_home');
   const info=d?inject(d.description,{saldo_kredit:context?.balanceKnown?
     String(context.balance):'—'}):neutral;
   // Operational navigation comes from the row's editable cta_route when set.
   // An unknown route never reaches data-route (XSS or arbitrary navigation).
   const requested=String(d?.cta_route||'').trim().replace(/^#/,'').toLowerCase();
   const destination=allowedRoutes.has(requested)?requested:routes[i-1];
   return '<button type="button" class="ngdm-shortcut" data-route="'+h(destination)+'">'+
     '<span class="ngdm-shortcut-icon" aria-hidden="true">'+['✦','◫','▤','↗'][i-1]+'</span>'+
     '<strong>'+h(d?.title||neutral)+'</strong><small>'+h(info)+'</small></button>';
  });
  return '<header class="ngdm-greeting"><div>'+
    '<h1>'+h(welcome)+'</h1></div></header>'+
    '<section class="ngdm-quick" aria-label="Menu member">'+
     '<div class="ngdm-shortcuts">'+cards.join('')+'</div></section>';
 }
 function portalText(items){
  return field(items,'CNT-PORTAL-DISCLAIMER','PORTAL_NOTICE',
    'member_portal','description');
 }
 function affiliateInfo(items){
  const r=row(items,'CNT-AJAK-TEMAN-INFO','AFFILIATE_INFO','member_affiliate');
  return '<section class="partner-public-intro ngd-cms-affiliate" aria-label="Program ajak teman">'+
    '<h1>'+h(r?.title||neutral)+'</h1><p>'+h(r?.description||neutral)+'</p></section>';
 }
 function checkoutGuide(items){
  const r=row(items,'CNT-CHECKOUT-GUIDE','CHECKOUT_GUIDE','checkout');
  const steps=[1,2,3].map(i=>row(items,'CNT-CHECKOUT-STEP-'+
   String(i).padStart(2,'0'),'CHECKOUT_STEP','checkout'));
  // The live Doc06 Sheet packs three steps into one description with |.
  const packed=String(r?.description||'').split(/\s*\|\s*/).map(x=>x.trim()).filter(Boolean);
  return '<div class="checkout-steps" role="group" aria-label="Langkah pembayaran">'+
    '<strong>'+h(r?.title||neutral)+'</strong>'+
    '<ol>'+steps.map((x,i)=>'<li>'+h(x?.title||packed[i]||neutral)+'</li>').join('')+'</ol></div>';
 }
 function checkoutButton(items){
  return field(items,'CNT-CHECKOUT-GUIDE','CHECKOUT_GUIDE','checkout','cta_label');
 }
 function paymentMessage(items,order,amount){
  const r=row(items,'CNT-CHECKOUT-WA-TEMPLATE','WA_TEMPLATE','checkout');
  if(!r||!r.description||!order||!amount)return '';
  const original=r.description;
  if(!['order_id','nama_produk','total_bayar'].every(x=>original.includes('{{'+x+'}}')))
   return '';
  return inject(original,{
   order_id:order.order_id,nama_produk:String(order.nama_produk||'').slice(0,100),
   total_bayar:amount
  });
 }
 global.NGD_CMS_SURFACES=Object.freeze({
  neutral,row,field,inject,auth,memberHome,portalText,affiliateInfo,
  checkoutGuide,checkoutButton,paymentMessage
 });
})(window);

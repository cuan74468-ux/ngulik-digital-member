/* Ngulik Digital × Scalev: public, read-only hosted checkout safety bridge.
 * NO provider API, secret, payment proof, referral attribution or money writes.
 * No product URL may be inferred from a SKU. Only links verified by the owner
 * against a published Scalev merchant checkout may be configured.
 */
(function(root){
  'use strict';
  var products=Object.freeze({
    'P-VIDEO-AI':Object.freeze({price:50000,type:'JASA_SEKALI'}),
    'P-3IN1':Object.freeze({price:99000,type:'LANGGANAN_30H'}),
    'P-POS':Object.freeze({price:149000,type:'LISENSI_SEKALI'}),
    'P-INTEGRASI-GAS':Object.freeze({price:400000,type:'JASA_SEKALI'})
  });
  function rupiah(value){
    if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?value:null;
    var str=String(value==null?'':value).trim().replace(/^Rp\s*/i,'').replace(/\s/g,'');
    if(!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)$/.test(str))return null;
    var amount=Number(str.replace(/\./g,''));
    return Number.isSafeInteger(amount)&&amount>=0?amount:null;
  }
  function link(url,host){
    try{
      var parsed=new URL(String(url||''));
      var approved=String(host||'').toLowerCase().trim();
      // Free shops use a Scalev-hosted checkout; never allow a guessed domain
      // or another merchant's domain unless re-reviewed against the dashboard.
      if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||
          !approved||parsed.hostname.toLowerCase()!==approved||
          !/^[a-z0-9-]+\.scalev\.id$/.test(approved)||
          parsed.hash||!(/^(\/p\/[^/]+|\/c\/checkout)$/.test(parsed.pathname)))
        return '';
      return parsed.href;
    }catch(_){return '';}
  }
  function checkout(product,offers){
    if(!product||!offers)return null;
    var sku=String(product.product_id||'');
    if(!Object.prototype.hasOwnProperty.call(products,sku))return null;
    var expected=products[sku],entry=offers[sku];
    if(!entry||typeof entry!=='object')return null;
    // No checkout is enabled by a frontend config alone unless owner-reviewed
    // provider details match current catalog and the documented Free policy.
    if(entry.status!=='READY'||entry.source!=='SCALEV_DASHBOARD_VERIFIED'||
       entry.commission_owner!=='NGD'||entry.scalev_affiliate!=='OFF'||
       entry.plan!=='FREE'||entry.merchant_name!=='Linggau AI Studio'||
       entry.e_payment_status!=='ACTIVE'||entry.owner_release!=='STAGING_APPROVED'||
       product.aktif!==true||
       String(product.tipe||'')!==expected.type||
       rupiah(product.harga)!==expected.price||
       rupiah(entry.price)!==expected.price)return null;
    var url=link(entry.checkout_url,entry.verified_host);
    return url?Object.freeze({url:url,sku:sku,price:expected.price,commission_owner:'NGD'}):null;
  }
  function previewEvidence(evidence,product,seen){
    // Returns a REVIEW marker only. This MUST NOT mark NGD orders PAID or grant
    // member credits, subscriptions, licenses or affiliate commissions.
    var issues=[],sku=String(evidence&&evidence.sku||''),
      rule=products[sku],providerId=String(evidence&&evidence.scalev_order_id||'').trim();
    if(!rule||!product||sku!==product.product_id||
       rule.type!==product.tipe||rupiah(product.harga)!==rule.price)
      issues.push('PRODUCT_MISMATCH');
    if(!/^[A-Za-z0-9_-]{6,100}$/.test(providerId))issues.push('PROVIDER_ID_REQUIRED');
    if(Array.isArray(seen)&&seen.indexOf(providerId)>=0)issues.push('DUPLICATE_ORDER');
    if(!evidence||evidence.status!=='PAID')issues.push('PAYMENT_NOT_VERIFIED');
    if(!evidence||rupiah(evidence.gross_amount)!==rule?.price)issues.push('AMOUNT_MISMATCH');
    if(!evidence||evidence.commission_owner!=='NGD')issues.push('COMMISSION_OWNER_CONFLICT');
    return Object.freeze({state:issues.length?'HOLD':'MANUAL_RECONCILIATION_REQUIRED',
      issues:Object.freeze(issues),provider_id:providerId||'',sku:sku});
  }
  root.NGD_SCALEV_BRIDGE=Object.freeze({products:products,checkout:checkout,
    previewEvidence:previewEvidence});
})(typeof window!=='undefined'?window:globalThis);

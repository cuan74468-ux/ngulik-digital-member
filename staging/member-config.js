/* Live STAGING application (same UI, isolated STAGING Sheets). Public URL only. */
window.NGD_CONFIG = Object.freeze({
  brand:'Ngulik Digital — STAGING',
  apiUrl:window.NGD_STAGING_CONFIG?.apiUrl||'', // single canonical staging/config.js source
  siteUrl:'https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html',
  memberWritesEnabled:true,
  registrationOtpEnabled:true,
  paymentsEnabled:true,
  adminLoginEnabled:true,
  contentEnabled:true,
  catalogEnabled:true,
  serviceEnabled:true,
  supportEnabled:true,
  notificationsEnabled:true,
  lmsEnabled:true,
  qrisImageUrl:'',
  qrisMerchant:'',
  qrisOwnerImageApproved:false // set true ONLY after replacing placeholder with real QRIS
});

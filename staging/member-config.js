/* STAGING is fail-closed during P0 verification: readonly UI except isolated admin login.
 * Client flags do not override NGD_MUTATIONS_ENABLED / NGD_FINANCE_ENABLED
 * and must not be set true until runtime attestation and explicit release approval. */
window.NGD_CONFIG = Object.freeze({
  brand:'Ngulik Digital — STAGING',
  apiUrl:window.NGD_STAGING_CONFIG?.apiUrl||'', // single canonical staging/config.js source
  siteUrl:'https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html',
  memberWritesEnabled:false,
  registrationOtpEnabled:false,
  paymentsEnabled:false,
  adminLoginEnabled:true,
  contentEnabled:false,
  catalogEnabled:false,
  serviceEnabled:false,
  supportEnabled:false,
  notificationsEnabled:false,
  lmsEnabled:false,
  qrisImageUrl:'',
  qrisMerchant:'',
  qrisOwnerImageApproved:false // set true ONLY after replacing placeholder with real QRIS
});

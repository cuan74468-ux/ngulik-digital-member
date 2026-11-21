/* STAGING QA UI gates: visible workflows may be exercised only when the matching
 * server-side release gates permit them. Production endpoint stays isolated.
 * Payments, token debits, refunds and provider calls remain blocked whenever
 * the Apps Script NGD_FINANCE_ENABLED property is false. */
window.NGD_CONFIG = Object.freeze({
  brand:'Ngulik Digital — STAGING',
  apiUrl:window.NGD_STAGING_CONFIG?.apiUrl||'', // single canonical staging/config.js source
  siteUrl:'https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html',
  memberWritesEnabled:true,
  registrationOtpEnabled:true,
  memberOtpLoginEnabled:true, // STAGING UI only; backend flag remains authoritative
  paymentsEnabled:false, // STAGING fail-closed until QRIS merchant scan + controlled financial QA
  adminLoginEnabled:true,
  contentEnabled:true,
  catalogEnabled:true,
  serviceEnabled:true,
  supportEnabled:true,
  notificationsEnabled:true,
  lmsEnabled:true,
  qrisImageUrl:'../assets/qris-linggau-ai-studio.svg',
  qrisMerchant:'Linggau AI Studio',
  qrisOwnerImageApproved:false // remains false until verified image is present on main/Pages
});

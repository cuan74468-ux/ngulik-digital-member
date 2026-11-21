/* STAGING QA UI gates: visible workflows may be exercised only when the matching
 * server-side release gates permit them. Production endpoint stays isolated.
 * Client-side financial workflows are prepared for STAGING only. No payment,
 * token debit, payout or settlement may run until backend finance is enabled,
 * and QRIS presentation remains blocked until merchant verification. */
window.NGD_CONFIG = Object.freeze({
  brand:'Ngulik Digital — STAGING',
  apiUrl:window.NGD_STAGING_CONFIG?.apiUrl||'', // single canonical staging/config.js source
  siteUrl:'https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html',
  memberWritesEnabled:true, // STAGING GAS verified mutations=true (21 Nov 2026)
  registrationOtpEnabled:true, // UI is additionally gated by verified STAGING API readiness
  memberOtpLoginEnabled:true, // STAGING UI only; backend flag remains authoritative
  paymentsEnabled:true, // STAGING UI opt-in; live finance still requires verified backend + official QR
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

/* Public frontend configuration. Never put API keys, PIN, or tokens here. */
window.NGD_CONFIG = Object.freeze({
  brand: 'Ngulik Digital',
  apiUrl: 'https://script.google.com/macros/s/AKfycbyQlhsRDfoHLIHaalBsBos5jJhvPmG3J8B0Al9XrqvUwBQkcnr8uzYRlpcjGlgC_-Xr/exec', // Deployment URL; server-side checks still apply.
  siteUrl: 'https://cuan74468-ux.github.io/ngulik-digital-member/',
  memberWritesEnabled: false, // production GAS doGet writes_enabled=false (21 Nov 2026)
  registrationOtpEnabled: false, // public writes are disabled at the API
  paymentsEnabled: false, // financial release OFF on live production API; merchant scan not certified
  adminLoginEnabled: true,
  contentEnabled: true,
  catalogEnabled: true,
  serviceEnabled: true,
  supportEnabled: true,
  notificationsEnabled: true,
  lmsEnabled: true,
  qrisImageUrl: 'assets/qris-linggau-ai-studio.svg', // display only after asset verified
  qrisMerchant: 'Linggau AI Studio',
  qrisOwnerImageApproved: false // asset exists; merchant identity and live settlement NOT verified
});

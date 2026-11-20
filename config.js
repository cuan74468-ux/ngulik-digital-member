/* Public frontend configuration. Never put API keys, PIN, or tokens here. */
window.NGD_CONFIG = Object.freeze({
  brand: 'Ngulik Digital',
  apiUrl: 'https://script.google.com/macros/s/AKfycbyQlhsRDfoHLIHaalBsBos5jJhvPmG3J8B0Al9XrqvUwBQkcnr8uzYRlpcjGlgC_-Xr/exec', // Deployment URL; server-side checks still apply.
  siteUrl: 'https://cuan74468-ux.github.io/ngulik-digital-member/',
  memberWritesEnabled: true,
  registrationOtpEnabled: true,
  paymentsEnabled: false, // release gate: official QRIS image 404; no checkout until verified
  adminLoginEnabled: true,
  contentEnabled: true,
  catalogEnabled: true,
  serviceEnabled: true,
  supportEnabled: true,
  notificationsEnabled: true,
  lmsEnabled: true,
  qrisImageUrl: 'assets/qris-linggau-ai-studio.jpg', // display only after asset verified
  qrisMerchant: 'Linggau AI Studio',
  qrisOwnerImageApproved: false // no payment prompt until actual image is verified on Pages
});

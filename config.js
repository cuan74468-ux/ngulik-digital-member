/* Public frontend configuration. Never put API keys, PIN, or tokens here. */
window.NGD_CONFIG = Object.freeze({
  brand: 'Ngulik Digital',
  apiUrl: 'https://script.google.com/macros/s/AKfycbyQlhsRDfoHLIHaalBsBos5jJhvPmG3J8B0Al9XrqvUwBQkcnr8uzYRlpcjGlgC_-Xr/exec', // GET and read-only POST verified via CI.
  siteUrl: 'https://cuan74468-ux.github.io/ngulik-digital-member/',
  memberWritesEnabled: false, // Enable only after authenticated, end-to-end membership verification.
  paymentsEnabled: false,
  catalogEnabled: false, // Admin catalogue mutations require an independent GAS staging gate.
  serviceEnabled: false, // Service briefs/quotes enabled only after verified live backend.
  supportEnabled: false,
  notificationsEnabled: false, // In-app inbox only; no email or WhatsApp delivery.
  lmsEnabled: false, // LMS mutations OFF until staging integration passes. // Only activate after authenticated staging support QA. // Requires verified QRIS and a separate transaction QA checkpoint.
  qrisImageUrl: '', // Example: assets/qris.png (upload owner-approved image only)
  qrisMerchant: ''
});

/* Public frontend configuration. Never put API keys, PIN, or tokens here. */
window.NGD_CONFIG = Object.freeze({
  brand: 'Ngulik Digital',
  apiUrl: 'https://script.google.com/macros/s/AKfycbyQlhsRDfoHLIHaalBsBos5jJhvPmG3J8B0Al9XrqvUwBQkcnr8uzYRlpcjGlgC_-Xr/exec', // Verified read-only service endpoint.
  siteUrl: 'https://cuan74468-ux.github.io/ngulik-digital-member/',
  memberWritesEnabled: false, // Retain until authentication and data mutations pass verification.
  paymentsEnabled: false,
  adminLoginEnabled: false, // Enable only after isolated GAS auth release and DB mapping are verified.
  contentEnabled: false, // Visual CMS writing requires separate GAS staging release.
  catalogEnabled: false, // Catalog editing is separately authorized on the server.
  serviceEnabled: false, // Service submissions and quotes require server authorization.
  supportEnabled: false,
  notificationsEnabled: false, // In-app inbox only; no email or WhatsApp delivery.
  lmsEnabled: false, // LMS editing requires role and server authorization.
  qrisImageUrl: '', // Example: assets/qris.png (upload owner-approved image only)
  qrisMerchant: ''
});

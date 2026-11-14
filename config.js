/* Public frontend configuration. Never put API keys, PIN, or tokens here. */
window.NGD_CONFIG = Object.freeze({
  brand: 'Ngulik Digital',
  apiUrl: '', // Insert verified Apps Script Web App /exec URL only after deployment approval.
  siteUrl: 'https://cuan74468-ux.github.io/ngulik-digital-member/',
  demoMode: true,
  paymentsEnabled: false,
  supportEnabled: false, // Only activate after authenticated staging support QA. // Requires verified QRIS and a separate transaction QA checkpoint.
  qrisImageUrl: '', // Example: assets/qris.png (upload owner-approved image only)
  qrisMerchant: ''
});

/* STAGING ONLY. No links until a merchant checkout URL is copied and verified
 * from the Linggau AI Studio Scalev dashboard after owner KYC and approval.
 * Never use app.scalev.com/dashboard, a TinyFish login URL, an API token, or a
 * guessed checkout slug. Public checkout links are NOT proof of payment.
 *
 * Example AFTER verification for an approved SKU only:
 * 'P-VIDEO-AI': Object.freeze({
 *   checkout_url:'https://YOUR-VERIFIED-SCALEV-SHOP.scalev.id/p/REAL-SLUG',
 *   verified_host:'YOUR-VERIFIED-SCALEV-SHOP.scalev.id',
 *   price:50000, status:'READY', source:'SCALEV_DASHBOARD_VERIFIED',
 *   commission_owner:'NGD', scalev_affiliate:'OFF', plan:'FREE',
 *   merchant_name:'Linggau AI Studio', e_payment_status:'ACTIVE',
 *   owner_release:'STAGING_APPROVED'
 * })
 * All four actual items intentionally remain unconfigured at this checkpoint.
 */
window.NGD_SCALEV_OFFERS=Object.freeze({});

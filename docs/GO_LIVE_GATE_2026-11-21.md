# NGULIK DIGITAL MEMBER — GO-LIVE GATE
Checkpoint: 2026-11-21 | Scope: GitHub Pages + GAS STAGING + Google Sheets
Status: NO-GO for live payments until gates below pass.

## Verified
- Source is in cuan74468-ux/ngulik-digital-member.
- STAGING endpoint is isolated in staging/config.js.
- Read-only staging database review: 29 tabs, member M-0009 role MEMBER, inviter M-0001 role ADMIN.
- Existing STAGING pilot has ORD-STG-0001 marked PAID, +10-token ledger, and KOM-STG-0001 PENDING. This is historic test data, NOT proof of real incoming merchant funds.
- Public/staging payments UI disabled and qrisOwnerImageApproved=false. STAGING backend was last operator-confirmed payments_enabled=false on 2026-11-20. Recheck immediately before release.
- OTP login M-0009 passed manual operator test. Registration OTP request and invite-code localStorage passed, but new-account referral binding has NOT been proven end-to-end.
- A legacy QA catalog product was archived without deletion.

## Blocking gates (all required)
1. **Source deployment:** Sync latest apps-script/Code.gs to the existing Kode.gs and Diagnostics.gs to the same GAS STAGING project without overwriting other staging-only modules. Save; run diagnostics; update the *same* STAGING web-app deployment and confirm endpoint identity. Never treat a GitHub commit as an automatic GAS release.
2. **Referral policy:** Operator decides disposition of legacy ADMIN-inviter referrals. Do not rewrite M-0002…M-0009 referred_by or historical commission records until adjudicated. Source currently blocks new commissions, auto-approval and payout for ineligible referrer. Confirm policy: role=MEMBER, status=AKTIF, and buyer cannot be own inviter. End-to-end test direct sign-up (no ref), eligible referral sign-up, first-touch lock, and repeat order.
3. **Commission/ledger reconciliation:** Run read-only finance diagnostics and admin reconciliation; review pending or overdue orders and existing commissions. No duplicate settlement, no unverified PAID, no duplicate credit or commission. Test TOPUP_TOKEN and TOPUP_KREDIT ledger completeness, refund reversal and 14-day hold, including boundary and idempotency.
4. **QRIS:** Verify the image served at assets/qris-linggau-ai-studio.svg by scanning with a real independent payment app and reading verified merchant name/NMID. Do not pay before receiver identity confirmed. Do not set qrisOwnerImageApproved=true merely because a file exists.
5. **Controlled real transaction:** With the merchant owner present, enable STAGING finance gate only for a short agreed pilot; create one unique order, send exactly the displayed amount, independently verify receipt in the merchant DANA/business account, confirm order, check member balance/service entitlement and one commission. Document settlement reference without exposing secrets.
6. **Payout:** Complete and test admin payout review interface or use an approved audited operator procedure; enforce eligible member payee, verified recipient, minimum Rp50,000, 14-day hold, duplicate transfer reference prevention and refund check. A UI showing balance alone is not a completed payout workflow.
7. **Service delivery:** Check each offer's price, scope, SLA, refund policy and fulfillment procedure before listing as orderable. Focus: P-VIDEO-AI, P-3IN1, P-POS, P-INTEGRASI-GAS. A catalog row being active is NOT delivery readiness.
8. **Public release:** Verify privacy/terms, consent, WhatsApp OTP sender quotas, secret management, account recovery and abuse rate limits, domain/Pages reachability, mobile checkout UX and support routing. CI and Pages must pass at latest commit. Complete roll-back instructions and daily backups appropriate to actual paid transactions.

## Release procedure
- Keep NGD_FINANCE_ENABLED=false and frontend paymentsEnabled=false until 1–4 and tests are satisfied.
- Release one controlled pilot before public opening. No silent provider or production changes.
- After verified merchant funds and reconciliation, obtain explicit owner approval for financial and production switches.
- Retest from an unauthenticated browser and a real member account on mobile.
- Mark GO only if all critical gates have dated supporting evidence; otherwise NO-GO.

## Source changes on 2026-11-21
- STAGING payment UI gate set to false and cache version refreshed.
- Inactive QA catalog item in STAGING Google Sheet.
- apps-script/Code.gs: ngdEligibleReferrer_ guard on new posting, timed auto-approval and payout; add legacy commission reconciliation flag; include TOPUP_TOKEN in ledger checks.
- apps-script/Diagnostics.gs: additional memory-only referral and token ledger scenarios.
- **These backend edits are GitHub source changes, not automatically live in GAS.**

## Manual-only decisions
- Whether legacy ADMIN M-0001 should be treated as a separate exceptional business arrangement; code currently follows the member-only affiliate policy.
- Confirm QRIS identity from actual payment application.
- Confirm real funds in DANA and authorize opening financial transactions.

## Checkpoint: reconciliation triage — 2026-11-21
- Operator executed diagnosticFinanceScenarios: 26/26 PASS (memory-only, before latest classification changes).
- Operator executed diagnosticFinanceReadOnly: FINANCE_AUDIT_OK (orders=2, ledger=10, commissions=1, members=9, products=15, errors=0, warnings=0). This basic integrity audit does NOT replace reconciliation.
- Operator executed diagnosticReconciliationReadOnly: checked=2, needs_review=1. ORD-STG-0001 flagged PAID_PENDING_FULFILLMENT_REVIEW and COMMISSION_REFERRER_NOT_ELIGIBLE.
- Transaction ORD-STG-0001 has historical TOPUP_TOKEN credit of 10 to M-0009 (balance previously confirmed 35), but order status PAID. Do NOT credit again or silently mark FULFILLED.
- M-0001 is ADMIN and historically receives commission KOM-STG-0001 PENDING. Keep historical evidence intact pending policy decision.
- Latest Code.gs improves classifications: TOPUP_PAID_LEDGER_POSTED_STATUS_REVIEW, TOPUP_PAID_LEDGER_COUNT_0, TOPUP_LEDGER_WRONG_MEMBER, and avoids COMMISSION_MISSING for an ineligible ADMIN inviter. Diagnostic scenarios expanded (expected 29 after syncing latest Diagnostics.gs).
- Latest source edits have been committed to GitHub main, but NOT YET confirmed synced into GAS. No backend deployment or public payment enabling authorized.
- **Next step:** sync BOTH latest Code.gs and Diagnostics.gs into the same STAGING GAS project and save. Run diagnosticFinanceScenarios, diagnosticFinanceReadOnly, diagnosticReconciliationReadOnly. Expected reconciliation: existing historic order still needs review, with more precise reason codes; no automatic data mutation.
- Operator must determine disposition of historic ADMIN commissions and order status only after independent evidence of payment/fulfillment.

## Verified operator retest — 2026-11-21 10:43 local
- Latest GAS editor diagnostics: `FINANCE_SCENARIOS_OK | cases=29 | mode=MEMORY_ONLY` (29 PASS), reported 10:42.
- Latest GAS editor reconciliation: `RECONCILIATION_SUMMARY {"checked":2,"needs_review":1}` (reported 10:43).
- Historical `ORD-STG-0001` remains `PAID`, flagged `TOPUP_PAID_LEDGER_POSTED_STATUS_REVIEW` and `COMMISSION_REFERRER_NOT_ELIGIBLE`. These are correct review flags, **not a reason to re-credit tokens or retroactively authorize a commission**.
- The reconciliation diagnostics were read-only. Historical balances, referral links, commission and order status were not modified by this step.
- Go-live remains **NO-GO**; payment feature remains OFF. Next verify infrastructure and DB integrity in STAGING editor, then update existing GAS deployment only after validation and authorized decision on historical anomaly.

## Verified operator preflight — 2026-11-21 10:46 local
- `ngdInfrastructurePreflightReadOnly` PASS: 29 tables, environment STAGING, `mutations_flag=true`, `preflight_writes=false`, `providers_flag=false`.
- `ngdDataIntegrityPreflightReadOnly` PASS: 8 tables, empty issues, `writes=false`.
- STAGING diagnostic success does not imply GAS web app has been updated. Existing deployment must be updated in-place and verified while financial payments remain OFF. Historical order `ORD-STG-0001` remains under review.

## Post-deployment read-only review — 2026-11-21 10:49 WIB
- User reports an in-place STAGING GAS deployment update. Independent GET on the prior STAGING /exec returned ok=true, version=1.0.3, writes_enabled=true, payments_enabled=false. Confirms endpoint reachability/flags, NOT an exact deployed source hash.
- Separate public-main /exec returned version=1.0.2, writes_enabled=false, payments_enabled=false. Its published frontend config has paymentsEnabled=false. Public main and staging remain different API endpoints.
- STAGING member page and frontend config accessible: paymentsEnabled=false, qrisOwnerImageApproved=false; nonfinancial member/admin writes enabled. Do not treat STAGING as globally read-only.
- Direct Sheets read: ORD-STG-0001 status PAID despite a populated fulfilled_at; one linked TOPUP_TOKEN +10 to M-0009; historical KOM-STG-0001 Rp1,000 PENDING to ADMIN M-0001, approval date 2026-12-02. No data mutation made.
- Second order NGD-261119-61ED29966DF7 remains PENDING though expires_at was 2026-11-19 11:59:34 WIB. Investigate as stale historical order, do not assume payment received or trigger financial maintenance while finance OFF.
- All 8 historical MEMBER rows have referred_by=M-0001 (role ADMIN); new MEMBER-to-MEMBER eligible referral registration not yet proven.
- Text search of js/app.js found no direct adminMarkCommissionPaid or adminGetReconciliation invocation. Admin payout/reconciliation user experience remains an unverified go-live gate.
- QRIS SVG external extractor returned empty_content, which is neither proof of 404 nor verified QRIS validity. Real independent merchant scan is pending.
- Result: STAGING payment gate OFF, infrastructure and data-integrity checks PASS, memory-only finance tests 29/29 PASS, historical reconciliation needs_review=1, live payment GO-LIVE remains NO-GO.
- Next: non-mutating post-deploy API smoke tests plus optional operator browser admin/member checks. Never enable money flows until controlled test and owner authorization.

## Public API smoke test and catalog UX pass — 2026-11-21
- GAS STAGING operator run `diagnosticApiPublic`: `API_PUBLIC_OK`, 9/9 checks passed; public info, brand, quota, public-safe catalog, no PIN hashes leaked, unauthenticated admin/member requests rejected. No writes (operator log, 10:51 WIB).
- Frontend source updated on GitHub main: shared `viewPublicMarketplace` for both guests and authenticated members, replacing the previous divergent member-only catalog layout. Member entitlement snapshot retained in expandable `Akses layanan saya`; partner shelf retained for signed-in members.
- Search, sort and category filtering now work for signed-in members as well as guests. No new product, media, price, payment, affiliate or fulfillment records created.
- New `assets/catalog-experience-v3.css` loaded after legacy CSS on public index.html and staging/member.html, with compact page intro, white-space, de-cluttered hero, horizontal category tabs, responsive 2-column phone and 3-column desktop grid, coherent product card typography and image fallbacks, accessible focus states and reduced-motion rules.
- Product catalog actions continue to use `config.paymentsEnabled`; payment-disabled message now explicitly states online checkout is not enabled. No payment gate or backend edits.
- App JS syntax parser PASS with module import stripped solely for parsing; stylesheet braces balanced 125/125. Published JS and CSS asset URLs read successfully from Pages. This is source/static smoke verification, NOT a visual interactive browser certification.
- **UAT pending:** operator inspect `#katalog` on Android and desktop for guest and signed-in MEMBER; test search, category, sort, cards, direct free resources, consultation links; verify admin pages unchanged and checkout remains blocked. No live payment attempted.

## Affiliate / Commission UX redesign — 2026-11-21
- Scope: guest `#affiliate` landing + signed-in MEMBER commission dashboard; same frontend JS for public and STAGING. No backend, Apps Script deployment, database or money configuration edited.
- Public entry simplified: short headline/CTA, three real process steps, catalogue link, honest FAQ (no guaranteed income claims or fabricated statistics). Removed decorative orbital hero and verbose duplicate narrative.
- Member task priority changed to: personal referral URL (Copy/WhatsApp) first, then factual 4-state commission summary, recorded click/member counters, optional free eBook/class sharing, chronological history and guarded payout. Free links and terms folded behind disclosure controls.
- Privacy and safety: all referral/payment amounts from backend only, canonical share URL always public, output escaped, no new payment mutation. With `paymentsEnabled=false`, member sees an explicit payout-closed state; no DANA input/action exposed.
- New stylesheet `assets/commission-experience-v2.css` uses concise responsive editorial components for guest and member, loaded **last** after legacy CSS in `index.html` and `staging/member.html`. Mobile targets >=44px, 2x2 metrics and single-column sharing actions.
- Source JS syntax parse PASS, CSS braces balanced, guest/member render smoke using synthetic in-memory fixtures PASS, assets CSS published on GitHub Pages after temporary 404 during Pages rebuild.
- Updated UI-specific tests: `tests/frontend-affiliate-partner.test.cjs` and member copy assertions in `tests/commission-lifetime-1level.test.cjs`. Those files parse; full CI success not yet established.
- CI transparency: the inspected `Validate backend and frontend (no deploy)` run #1009 (run 44863971721) FAILED with test assertions in multiple areas (including older commission eligibility assumptions and stale prior frontend snapshots). `Staging Source Check` and GitHub Pages deployment were successful. This is a nonpayment UI delivery, **not** a declaration of overall release readiness.
- Required operator UAT: open public and STAGING `#affiliate` on mobile as guest and as logged-in member. Test copy, WhatsApp link, expandable free links and terms, no payout when disabled, counters/ledger amounts and empty states; verify no unexpected wallet mutation.

## Product checkout unification — 2026-11-21
- Owner requires **every owned catalog product** to have an internal checkout page, no `Tanya via WhatsApp`, `Chat WhatsApp` or related commerce CTA. Implemented in frontend `js/app.js` for published catalog cards and the three home service cards.
- New `#checkout/<product_id>` deep-link route, with validated product ID and reloadable preview reading the current public catalog. Guest and member share the same product-specific view.
- All products open internal detail/price view. Paid offers supported by backend `NGD_CHECKOUT_TYPES_` (7 types) may create an order only after finance, owner QRIS image and member authorization gates pass. Unsupported/invalid-price items display an explicit blocked state rather than an invented price or a fake order.
- Free offers with verified free links (P-EBOOK and P-CLASS-CH1) have a free-access action **within the checkout**, not a money transfer. Zero-price and malformed prices cannot enter `newOrder_`.
- The only new paid-order path is `createOrder` on the existing GAS backend, which generates QRIS_STATIS order, unique payment amount/code and a pending ledger-free state. Client uses persistent request ID for safe retry and prevents concurrent double-submit.
- Both previously separate public and STAGING entrypoints load `assets/checkout-qris-unified.css` after older styles and `js/app.js?v=20261121-qris-checkout-v2`. Checkout is responsive and does not alter application backend/database.
- Existing order payment screen no longer presents WhatsApp or Mayar/Scalev as checkout alternatives. QRIS display and `Saya Sudah Bayar` require owner image approval and finance-enabled frontend; backend still independently requires `NGD_FINANCE_ENABLED=true`. **Both frontend configurations remain `paymentsEnabled=false` and `qrisOwnerImageApproved=false`; finance GAS flag reported false by operator. No real payable QR displayed.**
- New test file `tests/frontend-qris-checkout.test.cjs`: six targeted tests all PASS in GitHub Actions run #1017 (commit e6664a8). A seventh deep-link check added after this run and must be reverified. Overall `Validate backend and frontend` workflow is still FAIL due older cross-module/financial expectations, not certified.
- Payments GO-LIVE still **NO-GO** pending independently scanned DANA Bisnis QRIS proving merchant name/NMID, controlled small real payment, admin reconciliation, duplicate/retry protection with live test, and eligibility/payout review. Do not set finance flags to true until those checks are done; real QRIS STAGING or production payments are not enabled by this UI release.

### Product checkout deep-link clarification
- Browser route `#checkout/<product_id>` is reloadable for a valid active catalog ID; mismatched IDs show a safe empty state, never a stale order or QRIS.
- Public/STAGING script cache uses `v=20261121-qris-checkout-v2`, CSS uses `v=20261121-qris-checkout-v1`; no GAS redeploy necessary for frontend-only code.
- Full CI remains a separate gate. Do not infer readiness from UI source smoke alone.


## UX and CI stabilization verified — 2026-11-21
- **Scope:** public + STAGING frontend UI, safe route history, browser smoke, test fixture repair and runtime source manifest only. No live payment activation, no Apps Script backend business-policy edit, no ledger/commission/token balance write, no production GAS deployment or Google Sheets mutation.
- Anonymous live browser read-only QA of STAGING: 13 active products shown (including free materials), search/filter responds, cards use internal checkout not seller WhatsApp, QRIS display/payment actions remain disabled; mobile was not available in this browser run and was therefore tested separately in CI Chrome.
- Home service CTAs reference only product IDs present in `getKatalog`; product descriptions/names reflect the public API. **API contract finding:** server already filters `aktif=true` but omits `aktif` in response, so frontend must not require that field. Regression test covers this.
- Product checkout route uses `#checkout/<product_id>` and pushState + de-duplicated popstate/hashchange; URL can be shared, Back/Forward returns safely, no duplicate loading. Checkout remains payment-gated by independently controlled frontend and GAS flags.
- All requested internally owned products use internal checkout. No product CTA or checkout fallback points to WhatsApp, Mayar or Scalev. **External partner shelf** remains a disclosed off-site referral link, not a merchant-owned product and not paid to NGD QRIS.
- Node synthetic tests were repaired by supplying distinct active MEMBER inviters under the newer affiliate eligibility policy; **no security rule was relaxed**. All 15 GAS module Git blob hashes/byte sizes refreshed in `contracts/gas-runtime-source-manifest-2026-11-16.json`; operator logs do not prove exact GAS runtime blob identity.
- Legacy frontend assertions were aligned with real catalog/checkout UI. Headless Chrome smoke checks assert current catalog title and no live QR/payment actions when finance OFF.
- **CI VERIFIED SUCCESS:** GitHub Actions `Validate backend and frontend (no deploy)` #1070, run `44866842166`: **605 tests total; 596 pass, 0 fail, 9 TODO**. Full headless Chrome smoke success `BROWSER_UI_OK`, including public, logged preview, admin, catalog, mobile menu, LMS, member account and service checks. This is not a real-money checkout or an authenticated live member end-to-end test.
- **Pages publication VERIFIED SUCCESS:** `pages-build-deployment` #1130. Public assets `js/app.js?v=20261121-qris-checkout-v4` and `assets/checkout-qris-unified.css?v=20261121-qris-checkout-v4` reachable independently.
- **Release gates remain:** `NGD_FINANCE_ENABLED=false` last operator-checked; `paymentsEnabled=false` and `qrisOwnerImageApproved=false` in both frontend configs. QRIS merchant name/NMID must be independently scanned and verified and supervised real payment with admin reconciliation completed before any switch. `ORD-STG-0001` still requires historical PAID-vs-ledger and ADMIN-inviter commission adjudication; do not re-credit token or pay legacy admin commission. Nine CI TODOs still represent planned integration/release acceptance coverage; CI green means implemented tests passed, not release of these features.
- **Status:** source and public read-only frontend release QA PASS; actual financial operation **NO-GO**, no credentials/admin login payment test or real settlement certified.

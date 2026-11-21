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

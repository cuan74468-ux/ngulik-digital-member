# STAGING release review — 2026-11-26

Status: AUDIT PASS / DEPLOYMENT NO-GO / approval PENDING.

## Actual read-only audit

Run: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/45831921124
Timestamp: 2026-11-26T14:43:38Z (21:43 WIB).
Audited main: 3dabc17e8c2db1d439bf47b1f6d73425c36b7ccc.
Live immutable version: 34. Editor equals live: true.
Editor files: 28. Main package files: 40. Main package globals: 507.
Baseline digest: 99b88cf002f89f1509370f8d2864c90ff3d5543238a84f38c19b0780780f3a5e
Main candidate digest: 5285bca94c17582f12f889826333d7670cca86fa95668d4971b096dbefc48f58
Audit marker: NGD_STAGING_AUDIT_COMPLETE_NO_REMOTE_WRITE.
Release gate: PENDING.

## Candidate separation

License source reviewed: 126b8b5b41bf7ff60bbf15d1928c25b09d02783a.
Only GAS source delta relative to audited main is apps-script/Code.gs -> Kode.js.
Audited main's Kode.js was NOT in the changed list, so it matched the live editor at audit time.
Candidate changes: explicit new source revision; raw Studio pilot switch attestation on STAGING identity; scoped six-action router; embedded module.
No new GAS file, manifest scope, production endpoint or preserved file change.
Candidate package AST/synthetic evidence (NOT live): 40 files, 14 additional globals, no duplication.
CI: https://github.com/cuan74468-ux/ngulik-digital-member/actions/runs/45840523185
Wrapper CI: https://github.com/cuan74468-ux/linggau-ai-wrapper/actions/runs/45840635934 (45 immutable CDN files verified).

The main digest above MUST NOT be reused as the licensing candidate digest.
Actual private editor-only files are not available in this connector; do not invent their hashes.
The previous trigger review is historical: ngdDailyExecutiveReportTask (time-based, HEAD); report may send WhatsApp and write Script Properties. Do not run the handler or any tests that have external effects. Fresh trigger inventory is still required for release.
Ten special files are preserved byte-for-byte by existing packaging contract.

## Required gates before any deployment

1. Obtain current read-only Apps Script trigger inventory from authorized owner UI. Check that each handler exists in proposed package; verify other owners' triggers as applicable (one account's list cannot prove all owners' triggers).
2. Review STAGING-specific preserve files and source changes/side effects, including existing main modularization. Do not run setup, OTP, recovery, notification, report, finance or provider functions.
3. Verify raw NGD_STUDIO_PILOT_ENABLED absent or false, mutations OFF, finance OFF in actual STAGING properties; report only booleans, never values of IDs/keys/secrets. No changes under this review.
4. Obtain candidate-specific package digest from actual private snapshots in a trusted owner-controlled audit. Recheck baseline version/digest and editor equality. Do not expose source, credentials, or private files in public logs. Prefer existing package builder from exact candidate revision with offline/private snapshot; alternatively require a new owner-approved trusted main audit after a separately approved integration decision. Existing protected runner accepts only main; do not bypass with candidate workflow.
5. Explicit owner approval of reviewed version, baseline digest, candidate digest, trigger list and side-effect review, recorded in contract. Separate approval to integrate into main (Pages can publish) and to deploy GAS, preserving default OFF.
6. Main exact SHA CI and read-only audit, then protected deploy with rollback version 34 only if fresh baseline confirms it. Verify source marker and default OFF; no pilot activation yet.
7. Separate owner-approved small STAGING pilot, real Canvas transport/CORS and runtime tests, then commercial decision.

Do not merge, deploy, modify Script Properties, activate finance, publish Canvas, or rotate preview pointer based on this checkpoint. This document records evidence and open gates, not a release approval.

## Owner Cloud Shell reconciliation — 2026-11-26

Owner supplied actual output of official package builder on snapshot with exact baseline matching run 45831921124. Main candidate digest assertion also passed. This is owner-executed evidence, not a direct connector inspection of the private snapshot.
- Reviewed candidate source: 12ec132f70748ce559d556b46ab88613f074beb2 (Code.gs and all GAS source unchanged by this evidence-only commit).
- Baseline digest: 99b88cf002f89f1509370f8d2864c90ff3d5543238a84f38c19b0780780f3a5e
- License candidate digest: ed9fabc9bc24c72f524897beaed31857b2d076f17520fe9b450d96431e1b157d
- 28 editor files; 40 total candidate files; 521 global bindings; 10 preserved files; 14 added globals relative to main package; release gate PENDING.
- Runtime read-only attestation: environment STAGING; mutations false; finance false; Studio pilot NOT_EXPOSED_V34 (NOT evidence that raw property is OFF).
- Preserved handler inventory includes ngdDailyExecutiveReportTask. This confirms the handler exists in proposed package, not that it is the only installed trigger. NGD_CreditLedgerSyntheticTest.js reports no global declarations; byte preservation confirmed, not a claim about internal behavior.
- Remaining: owner read-only trigger UI inventory for all applicable accounts and raw pilot property absent/OFF; review private helper side effects and existing managed module changes (do not execute). Explicit approval of reviewed deployment and separate integration approval remain required. Recheck exact baseline/candidate digests immediately before any release. Do not use main digest to approve license package.
- No remote mutation, no deployment, no approval change. The connector cannot independently inspect private helper contents or installed triggers. No private identifiers or credentials recorded.

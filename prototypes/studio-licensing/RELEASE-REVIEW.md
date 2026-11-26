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

## Owner UI evidence — 2026-11-26 21:55 WIB

Owner supplied screenshots of project NGULIK DIGITAL MEMBERSHIP: one visible time-driven trigger, owned by current account (Saya), HEAD, handler ngdDailyExecutiveReportTask, last run 26 Nov 2026 21:52:09, displayed error rate 0.05%. Handler is present in preserved DailyExecutiveReport.js as verified by owner package output. This is current-account scope; other accounts' installable triggers not attested. Raw NGD_STUDIO_PILOT_ENABLED=false visible in Script Properties. Combined with prior runtime attestations, all three switches were OFF at their respective check times. Screenshots not committed (contain private metadata). HEAD trigger remains a deployment/rollback concern; avoid running report manually.

To finish side-effect review, use local-only review-local-package.cjs on the same private snapshot and exact candidate package. It checks known digests, compares ASTs of legacy managed source and modular Visual bundle versus main, then main versus licensing candidate, and prints only declaration/effect-name inventories. Does not execute GAS or print credentials/source. Static triage, not proof of complete behavior. Release approval unchanged PENDING. CI 45843652507 on prior documentation commit SUCCESS.

## Session 13 — release-scope isolation (candidate decision; not approved)
Owner local AST evidence: 11 changed-byte managed modules AST identical; Catalog (7 top-level declarations), LMS (2 functions) and Visual bundle have actual AST differences; 10 preserve files byte-identical, no direct selected-effect calls at top level detected (not a call graph proof). Manifest semantically identical. License delta exactly 3 pre-existing declarations and 14 new functions. Existing broad candidate fingerprint ed9fabc9bc24c72f524897beaed31857b2d076f17520fe9b450d96431e1b157d remains valid for the 40-file plan only.
Decision: isolate Studio release rather than approve unrelated Catalog/LMS/Visual changes. Proposed one-time releaseProfile studio-license-only-v34 uses exact known v34 baseline digest, retains all 28 file names and all 27 other files byte-for-byte (including existing Visual bundle and manifest), changes only Kode.js. Enforce existing global ownership, exactly 14 new Studio functions and only three previously reviewed top-level declarations changed. Full modular plan remains separately available via build(). Runner and local packaging CLI select the explicit profile via buildRelease(); fail closed if baseline digest/version drifts. This is intentionally one-time: after successful deployment, future audits/releases require separate profile review, not blind reuse. Source Code.gs unchanged; actual minimal candidate digest must be computed on owner snapshot, and is distinct from prior 40-file digest. Contract remains PENDING; main unchanged. No live writes, flags, triggers, deployment or approval changes. Synthetic CI is not actual private snapshot evidence.

## Owner minimal package audit — 2026-11-26

Owner supplied exact buildRelease output against the same fingerprint-verified private snapshot. STUDIO_LICENSE_ONLY_PASS. Reviewed source revision 795c0bc9049b52d2c42fcfc694566dc66334b60f; baseline v34 digest 99b88cf002f89f1509370f8d2864c90ff3d5543238a84f38c19b0780780f3a5e; minimal candidate digest 95e430412408a8b01225d068d9fb6d64415fc1c0db02b44af8230977fe885adf; profile studio-license-only-v34; 28 files, only Kode.js changed, zero removed, 14 new globals. 27 files including legacy Visual bundle, Catalog, LMS, manifest and all 10 private helpers remain byte-identical. CI 45844920794 SUCCESS: 31 licensing, 9 AST/package review, 889 regression, 1 cross-repository contract, Chromium portal PASS.

Scope review: Kode.js in original main matched audited v34. Candidate adds only the Studio scoped router, 14 Studio functions, source marker and read-only raw pilot attestation. OFF master switch denies Studio access; existing writes/finance gates remain independent. When enabled separately, cache operations may issue/revoke credentials; admin allowlist update writes a Script Property and existing audit log under lock, not finance/provider. No invocation of existing helper functions is added by the release; existing HEAD report trigger source is byte-identical. Trigger screenshot covers current owner account only; concurrent trigger execution and external side effects are not proven absent by AST. Do not manually run report/setup/test helpers. Actual pilot CORS and load remain untested.

The full 40-file fingerprint is NOT approved for this release. Minimal digest above is evidence, not permission to write. Prepare draft PR into main for review only; keep contract approval PENDING and no merge or deployment until explicitly authorized. Main merge may publish default-OFF static frontend. Recheck baseline, all switches and applicable trigger owners before deployment; use protected workflow and rollback version 34. No active runtime or production changes in this checkpoint.

## Owner deployment authorization — 2026-11-26

Owner explicitly authorized minimal GAS STAGING deployment only after final audit PASS, rollback v34. Owner confirmed complete trigger inventory (one HEAD time trigger ngdDailyExecutiveReportTask) and all security switches remain OFF. No pilot, general mutations, finance, or production activation authorized. PR #59 merged with separate owner consent; main 8d94a8229091f82c8538616c579ed4acad68ef4e, all four CI/Pages workflows SUCCESS. Runtime attestation run 45845988736 confirms mutations=false, finance=false. Minimal fingerprint remains 95e430412408a8b01225d068d9fb6d64415fc1c0db02b44af8230977fe885adf; v34 baseline 99b88cf002f89f1509370f8d2864c90ff3d5543238a84f38c19b0780780f3a5e. Scope review covers only three amended top-level declarations and 14 Studio functions in Kode.js; 27 remaining files byte-identical. Contract now APPROVED for this exact minimal package only, conditional on protected final audit, not approval of full modular migration.

Deployment control: protected audit on exact approved main SHA now verifies approved fingerprints, editor/live equality, mutation/finance OFF and required CI. Deploy requires explicit successful audit run ID (same SHA, actual audit step, <=24h), rechecks live baseline and flags before upload and before redeploy, preserves rollback v34. Raw pilot switch was confirmed OFF by owner; v34 cannot expose it via API, so new runtime verifies raw OFF and MAINTENANCE before accepting deployment. No runtime write was performed by this approval commit. Contract/test/workflow edits do not change package fingerprint. No execution of manual report or private helpers. Future audit after release needs separately reviewed profile (v34 one-time).

## 2026-11-27 — failed upload diagnosis, no retry

Run 45847713080 failed at CLASP_FAILED: push after exact approved package audit and baseline check. ROLLBACK_BOTH_VERIFIED at 15:21:36Z confirms live v34, original editor digest and read-only health at recovery. No successful new deployment. Exact cause unknown: previous runner intentionally discarded all raw CLI diagnostics. Reviewed google/clasp v3.4.1 source confirms push --force and show-file-status are supported. Google's updateContent requires script.projects OAuth write scope. Read access alone is not proof of write permission.

Runner-only remediation: protected audit checks actual clasp tracked file inventory for both candidate and recovery packages, introspects actual isolated OAuth token for script.projects and script.deployments, verifies project metadata and bound container capability when available. Logs only counts, booleans and fixed error categories; never print source, raw errors, email, IDs, tokens or secrets. Container capability is not proof of server acceptance; standalone/unavailable capability is explicitly noted. Tests cover sanitized error categories and inventory drift. The final audit must be rerun for the new main SHA; no deployment retry performed. Candidate source, approved fingerprint, trigger inventory, v34 rollback, and all security flags unchanged. Owner approval remains limited to minimal STAGING release after final audit. Pilot and production stay OFF.

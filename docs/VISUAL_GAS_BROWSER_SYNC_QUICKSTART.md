# Ngulik Visual Studio — Browser-first GAS STAGING Sync

**Source-only checkpoint. No GAS push, deployment, Script Property writes or provider calls have been performed.** P0 mutations and finance must remain OFF; Starter Pack real transactions remain NO-GO.

## Why the shortcut must be gated

The official clasp push operation uploads the entire Apps Script project, not just 13 Visual files. The actual editor HEAD of GAS STAGING v28 has not been read and cannot be claimed identical to GitHub main. The workflow runs a remote pull and checks that all pre-existing non-Visual files match exactly before any upload. It accepts the remote Code.gs only if it is byte-identical to GitHub or differs solely by the isolated Visual doGet/doPost additions. It accepts the manifest only if the difference is the additive Google Drive OAuth scope. Any other difference, extra remote file, altered Diagnostics.gs or changed P0 code blocks the push. Never bypass this.

## Option A — browser extension (not automatically safe)

Google Apps Script GitHub Assistant: https://chromewebstore.google.com/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo

The extension supports GitHub Pull. Its website states that the Google OAuth app is not Google-verified. Inspect its requested permissions, branch selection, nested-folder mapping and exact diff before using. Back up the whole GAS STAGING editor. If it cannot preview/select the precise changed files, do NOT use it to overwrite STAGING v28.

## Option B — GitHub Actions, audit first

Workflow: .github/workflows/sync-gas-staging.yml

One-time setup in a trusted browser-based Google Cloud Shell or equivalent environment:

1. Open the correct **GAS STAGING** project → Project Settings → Script ID. Do not use a web app deployment URL or an ID of production. Enable the Apps Script API in https://script.google.com/home/usersettings .
2. Install official @google/clasp@3.4.1 and authenticate as a trusted STAGING-only Google account using clasp login --no-localhost. OAuth in Cloud Shell may require browser authorization/redirect handling. Do not send the generated token to chat or commit it.
3. GitHub → Settings → Secrets and variables → Actions → New repository secret:
   - CLASPRC_JSON = complete JSON contents of ~/.clasprc.json
   - GAS_STAGING_SCRIPT_ID = Script ID from step 1 (NOT the /exec URL)
   The refresh token can access other Google Apps Script projects within its OAuth scope. Prefer dedicated STAGING access, limit access to repository secrets and rotate/revoke if exposed.
4. GitHub → Actions → Sync GAS STAGING (manual, drift-protected) → Run workflow on main → mode = audit. This first pulls actual GAS editor HEAD into an ephemeral runner, compares all legacy code against repo, and makes **no remote edits**.
5. If audit fails, stop and review/backup actual editor source. If audit passes and full independent v28 backup is secured, choose mode = push and type EXACT confirmation: I_BACKED_UP_GAS_STAGING_V28_NO_PRODUCTION. It saves a recovery GAS version and only then executes a full-source push. It does not deploy or redeploy v28 and does not change any Script Properties.
6. If there are legacy files or source drift, fix/parity-review first in a separate PR. Do not weaken the guard.

There is no scheduled or merge-triggered push. GitHub Actions quotas and Apps Script quotas apply; no promised 3-second execution.

## One-Run Visual setup (after source sync)

Open GAS STAGING editor → Project Settings → Script Properties. Enter only:

- NGD_VISUAL_PRIVATE_FOLDER_ID = the ID (not URL) of an existing PRIVATE Google Drive folder owned by the deploying GAS account
- NGD_KEY_GOOGLE_AI = private Gemini key if available; optional for offline setup. Do NOT paste this key into VisualRuntime.gs or GitHub.

Confirm existing NGD_ENVIRONMENT=STAGING, NGD_MUTATIONS_ENABLED=false, NGD_FINANCE_ENABLED=false. Verify the STAGING member M-0009 is ACTIVE. If it is not, enter one extra property NGD_VISUAL_UAT_MEMBER_ID with the correct ACTIVE member ID.

In Apps Script function selector choose ngdQuickBootstrapVisualStaging → Run. Approve the required Drive authorization only on known STAGING project. The function:
- verifies STAGING, P0 OFF, private folder and active pilot member before any setup;
- fills all safe Visual OFF flags and rate limit 1; daily provider budget = 0;
- creates/reuses a private worker secret;
- privately initializes the 12-layer recipe registry, without overwriting valid existing registry;
- funds **one time only** the isolated Visual STAGING test wallet with 12 test credits (never actual P0 member tokens);
- removes temporary approval flags and returns only safe metadata, no API key or worker secret.

It does NOT install a worker trigger, enable paid generation, set provider price estimates, or deploy a web app. The Google Gemini 3.1 Flash Image API is not known to have free image generation; do not turn on Visual LIVE without explicit billing approval and model-specific pricing verification.

## Next gated stage

After audit+push+bootstrap, verify read-only Visual wallet and MOCK jobs. Separately review trigger functions ngdVisualWorkerTickStaging (minute) and ngdVisualWorkerCleanupStaging (hourly), OAuth, GAS versioned deployment and the STAGING frontend endpoint. No production/P0 changes.

The full runtime checklist remains docs/VISUAL_STAGING_WIRING_CHECKPOINT.md .

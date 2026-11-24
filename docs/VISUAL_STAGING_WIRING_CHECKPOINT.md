# Ngulik Visual Studio P1 — STAGING Wiring

Status: source-only Draft PR #35, no GAS deploy, no provider requests, no Script Properties writes.

## Source install

After a full backup of GAS STAGING v28, compare its editor contents with GitHub main. The required Visual files are:
- VisualAdapterContract.gs
- VisualApi.gs
- VisualCompiler.gs
- VisualJobs.gs
- VisualMedia.gs
- VisualProvider.gs
- VisualQuality.gs
- VisualRuntime.gs
- VisualSkills.gs
- VisualStore.gs
- VisualUpload.gs
- VisualWorker.gs

The two isolated routing additions in Code.gs (Visual-only doPost allowlist and read-only doGet flag) and appsscript.json Drive OAuth scope are also required. NEVER overwrite all of Code.gs from GitHub without inspecting the actual STAGING editor: GAS v28 may differ. Do not modify Diagnostics.gs or any P0 finance logic.

## Script Properties — Visual only

- NGD_ENVIRONMENT = STAGING (preserve existing)
- NGD_VISUAL_PRIVATE_FOLDER_ID = a Google Drive folder ID that is private to the deploying account
- NGD_VISUAL_FOOD_MAGAZINE_V2 = valid private food skill-registry JSON (required by compiler)
- NGD_VISUAL_WORKER_SECRET = random private secret of at least 32 characters
- NGD_VISUAL_PROVIDER_COST_ESTIMATES_IDR = private verified conservative per-image IDR estimates for all enabled models
- NGD_VISUAL_DAILY_BUDGET_CAP = positive integer rupiah ceiling; zero or absent prevents live jobs
- NGD_VISUAL_RATE_LIMIT = 1 for initial controlled member UAT
- NGD_VISUAL_FLUX_AGGREGATOR = kie or fal (not relevant to Gemini-only pilot)
- NGD_KEY_GOOGLE_AI = Google API key only after entitlement/zero-cost limits confirmed
- NGD_KEY_KIE_AI and NGD_KEY_FAL_AI = remain unset until separately approved

Visual gates start OFF: NGD_VISUAL_LIVE_ENABLED=false, NGD_VISUAL_CREDITS_ENABLED=false, NGD_VISUAL_MEDIA_READY=false, NGD_VISUAL_WORKER_READY=false. Each requires independent authorization. Existing P0 NGD_MUTATIONS_ENABLED=false and NGD_FINANCE_ENABLED=false are unchanged.

Visual credit wallet is NOT the member financial token ledger and has no public funding method. A dedicated STAGING test-wallet provisioning procedure and reconciliation must be audited before live use.

## First UAT / Android

1. Keep all gates OFF. Test server read-only Visual health/catalog/quote with a valid member session; verify zero provider calls and zero P0 changes.
2. Copy modules only after backing up current GAS v28 and reviewing the two narrow Code.gs routing changes. Authorize Drive OAuth scope and confirm folder privacy; a NEW STAGING deployment requires separate approval, not performed by this PR.
3. Test 200–500 KB local JPEG chunk upload; check invalid MIME, unauthorized member, SHA256 mismatch, private output ownership, and scheduled cleanup.
4. Mock worker/ledger first: full and partial refunds, idempotency and daily budget/rate caps; verify P0 token balances unchanged.
5. Check official Google AI Studio API free image-generation availability for the exact model. Browser playground free access is NOT proof of a free image API. If the model is paid or requires billing, STOP. Do not turn on LIVE or generate.
6. Only after documented no-charge entitlement and consent, enable a controlled one-image UAT in a NEW STAGING deployment: select Bakso Len hot_soupy_food + steam_broth_hero or Madu Ku bottled_liquid + obsidian_mirror_splash, restoration full, 4:5, get server quote, upload privately, poll, and retrieve owner-only result. Reconcile Visual credits and cleanup.

No real Starter Pack purchases or P0 mutations may occur.

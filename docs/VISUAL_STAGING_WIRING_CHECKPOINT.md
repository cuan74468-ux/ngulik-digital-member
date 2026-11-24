> **Cara yang lebih ringkas (opsional):** gunakan panduan `docs/VISUAL_GAS_BROWSER_SYNC_QUICKSTART.md` untuk audit otomatis GitHub Actions sebelum sinkronisasi. Jangan gunakan metode Push/Pull apa pun sampai perbandingan `Code.gs` GAS STAGING v28 lulus; `clasp push` mengirim seluruh source. Setelah source aman, `ngdQuickBootstrapVisualStaging` mengisi default Visual dengan hanya dua Script Properties privat, tanpa mengaktifkan AI LIVE atau P0.

# Ngulik Visual Studio — GAS STAGING manual activation (operator checkpoint)

**Status:** GitHub source and unit/Chrome checks are not a verified GAS deployment. Never overwrite GAS STAGING v28 or any production source blindly. **Starter Pack transactions stay NO-GO:** `NGD_MUTATIONS_ENABLED=false`, `NGD_FINANCE_ENABLED=false`. No source change to P0 financial logic, `Diagnostics.gs`, any database table, or historical STAGING rows.

## A. Sync in Chrome browser (laptop is easier; Android browser also possible)

1. Open GitHub `cuan74468-ux/ngulik-digital-member` on `main` AFTER PR #35 is merged. Open `apps-script/`. Separately export/back up ALL GAS STAGING editor source + its manifest and note deployment v28 identifier. Do not modify production.
2. In the GAS STAGING editor, create or update the following **13** individual .gs files using the exact latest GitHub source:
   - `VisualAdapterContract.gs`
   - `VisualApi.gs`
   - `VisualCompiler.gs`
   - `VisualJobs.gs`
   - `VisualMedia.gs`
   - `VisualProvider.gs`
   - `VisualQuality.gs`
   - `VisualRuntime.gs`
   - `VisualSkills.gs`
   - `VisualStore.gs`
   - `VisualTemplates.gs`
   - `VisualUpload.gs`
   - `VisualWorker.gs`
3. **Existing `Code.gs`: DO NOT REPLACE WHOLE FILE.** Compare deployed STAGING editor contents with GitHub; apply only the isolated Visual allowlist/doPost dispatch and the read-only doGet capability field after confirming the existing member `session_(token)`, `byId_`, and `apiOutput_` contracts are identical. No touching the finance router, mutation switches, data functions, or `Diagnostics.gs`.
4. Show manifest file in GAS Project Settings (checkbox **Show appsscript.json manifest file in editor**). Ensure `runtimeVersion: "V8"`, Asia/Jakarta timezone, existing spreadsheet/external-request/script scopes unchanged and **add `https://www.googleapis.com/auth/drive`**. This requires fresh OAuth consent: authorize only on the known STAGING account after checking all scopes. Never replace manifest without diff review.
5. Save/editor compile-check without updating deployment. Run operator-only read functions first; verify no calls to providers or P0 finance. A new GAS STAGING deployment version is a **separate explicit release step**. The existing v28 webapp stays untouched until approved.

**Caution:** Pasting code into Apps Script changes EDITOR HEAD; it does NOT automatically update deployed webapp v28. Reconcile repo vs live editor hashes before applying. During UAT use an explicitly versioned new STAGING deployment and record its rollback version; never overwrite historical data.

## B. Script Properties table — exact keys

| Script Property | STAGING initial value / rule | Purpose |
|---|---|---|
| `NGD_ENVIRONMENT` | `STAGING` (preserve existing) | Environment guard |
| `NGD_MUTATIONS_ENABLED` | **`false`** | P0 global mutation OFF |
| `NGD_FINANCE_ENABLED` | **`false`** | P0 real finance OFF |
| `NGD_VISUAL_LIVE_ENABLED` | **`false`**; set `true` LAST with approved image-API cost | Visual-only provider activation |
| `NGD_VISUAL_CREDITS_ENABLED` | **`false`** until separate wallet ledger validated | Dedicated Visual wallet reservation |
| `NGD_VISUAL_MEDIA_READY` | **`false`** until Drive folder/permissions/cleanup tested | Private media guard |
| `NGD_VISUAL_WORKER_READY` | **`false`** until time-driven trigger and refund tests validated | Async queue guard |
| `NGD_VISUAL_TEMPLATES_ENABLED` | **`false`** initially; independent `true` only after private folder sync UAT | Personal preset cloud sync; does NOT enable image provider |
| `NGD_VISUAL_PRIVATE_FOLDER_ID` | ID from dedicated PRIVATE Google Drive folder URL (never a public URL) | Private source/output/template/store |
| `NGD_VISUAL_PRIVATE_REGISTRY_SETUP_APPROVED` | `I_APPROVE_STAGING_RECIPE_INSTALL_ONLY` **only immediately before manually executing** `ngdVisualPreparePrivateRegistryStaging`; remove afterward | One-time private registry creation; never overwrites |
| `NGD_VISUAL_FOOD_MAGAZINE_V2` | Generated privately by the above function; do not enter dummy JSON | 12-layer compiler private registry |
| `NGD_VISUAL_UAT_MEMBER_ID` | Existing ACTIVE STAGING member ID, e.g. `M-0009` **after verification** | Test wallet owner |
| `NGD_VISUAL_UAT_SEED_APPROVED` | `I_APPROVE_STAGING_VISUAL_TEST_CREDITS_ONLY` **only immediately before manual `ngdVisualProvisionPilotWalletStaging`; remove afterward** | One-time 12 dedicated Visual test credits, no P0 tokens |
| `NGD_VISUAL_WORKER_SECRET` | Cryptographically random private string of 32+ characters | Trusted trigger-only worker |
| `NGD_VISUAL_ALLOWED_MACHINES` | `gemini_flash_image` for Google-only UAT; additional IDs only after provider key verified | Server engine allowlist |
| `NGD_VISUAL_PROVIDER_COST_ESTIMATES_IDR` | Private JSON using independently verified conservatively high **actual** provider cost/image, e.g. shape `{"gemini_flash_image":<verified_idr_amount>}`; never guess monetary values | Provider spending guard, not shown to member |
| `NGD_VISUAL_DAILY_BUDGET_CAP` | Missing/0 until approved; positive integer Rupiah cap only with known billing exposure | Global daily provider budget |
| `NGD_VISUAL_RATE_LIMIT` | `1` for initial per-member per-hour UAT | Abuse throttle |
| `NGD_KEY_GOOGLE_AI` | Private Gemini API key **only after checking image generation entitlement/billing** | Google image adapter, never browser |
| `NGD_KEY_KIE_AI` | Unset for Google-only UAT | Paid Kie adapter, separate approval |
| `NGD_KEY_FAL_AI` | Unset for Google-only UAT | Paid fal adapter, separate approval |
| `NGD_VISUAL_FLUX_AGGREGATOR` | `kie` or `fal` after approving Flux; default Kie, irrelevant to Gemini UAT | Private Flux transport |

**Never store actual key values in GitHub, README, screenshots, or client.** Operator functions must be run in editor by the authorized STAGING owner; neither function is a web API action. Preset synchronization and visual generation have independent switches.

## C. Worker and private retention

- **GAS Time-driven trigger is REQUIRED** for real async provider jobs. Frontend polling only reads status and never invokes provider generation.
- Once all backend/offline tests pass, GAS left sidebar **Triggers → Add Trigger → function `ngdVisualWorkerTickStaging` → Head → Time-driven → Minutes timer → Every minute** (exact options may vary).
- Add second time-driven trigger **`ngdVisualWorkerCleanupStaging` → Hour timer → Every hour**, including after provider LIVE is switched OFF so expired held credits can refund and expired private uploads can be deleted.
- The worker processes **at most one image slot per invocation**. If provider queue does not finish yet, its provider task ID is retained for later polling. Never install a trigger from public web POST.
- Check Apps Script execution logs for worker success and no secrets. If a step errors, switch `NGD_VISUAL_LIVE_ENABLED=false`, keep cleanup running, inspect job ledger/held/refunds before retry.
- GAS V8 supports `async`/`await` and `Promise`; `UrlFetchApp` requires `script.external_request` OAuth scope. Test actual trigger execution once after the STAGING deployment is reviewed. (Official runtime: https://developers.google.com/apps-script/guides/v8-runtime ; triggers: https://developers.google.com/apps-script/guides/triggers/installable)

## D. Required acceptance tests, no-cost FIRST

1. **Readiness OFF:** With all Visual flags `false`, check member STAGING login, `visualHealth` -> `live:false`, `visualCatalog` and `visualQuote` returning 2/3/4 credits; no provider network request, P0 balances untouched.
2. **Storage/preset UAT:** Create PRIVATE folder with the deploying account, approve scope, test owner-only upload (JPEG/PNG/WebP <=4MB), wrong-session rejection, checksum, expiration/cleanup, and `Preset Saya` save/reopen/delete (independently enable `NGD_VISUAL_TEMPLATES_ENABLED` only after Drive ready).
3. **Operator seed/wallet:** After verifying STAGING member is ACTIVE, run operator recipe bootstrap once. Then with Visual LIVE and CREDITS both still OFF run `ngdVisualProvisionPilotWalletStaging` once; confirm `ngdVisualPilotWalletStatusStaging` shows **12 Visual test credits**, existing P0 token balance unchanged. Remove setup approval properties immediately.
4. **Mock job:** Validate one-image success, idempotent repeat, four-request/three-success partial settlement, timeout full refund, owner-only outputs, conservative IDR cap, per-member rate. Confirm OFF-mode cleanup refunds expired held credits.
5. **Commercial model check before real provider:** As of Nov 2026, official Google Gemini API pricing lists `gemini-3.1-flash-image` image generation as **not available on Free Tier**. Having a free AI Studio key or using the web playground is NOT a zero-cost API entitlement. Unless a verified free quota for the exact model exists, **DO NOT SET LIVE=true OR GENERATE REAL IMAGES**; stop at mock testing. Official pricing: https://ai.google.dev/gemini-api/docs/pricing .
6. **Only with explicit cost approval:** Put verified provider unit costs in private estimates; set small positive budget, permit `NGD_VISUAL_ALLOWED_MACHINES=gemini_flash_image`, verify trigger, media and wallet. Switch `NGD_VISUAL_MEDIA_READY`, `NGD_VISUAL_WORKER_READY`, `NGD_VISUAL_CREDITS_ENABLED` to `true` only after their acceptance, then `NGD_VISUAL_LIVE_ENABLED=true` LAST. Verify authenticated `visualHealth.live===true`.
7. **Android one-photo flow:** Open `https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html` -> login ACTIVE member -> Studio AI -> Ngulik Visual -> **Inspirasi** -> choose Bakso Len `hot_soupy_food/steam_broth_hero` or Madu Ku `bottled_liquid/obsidian_mirror_splash` -> **Gunakan** -> upload own 200-500KB photo -> choose 1 image -> verify quote **2 credits for Gemini** (or 3 for Kontext once paid provider approved) -> Generate -> watch the queue -> privately retrieve result, verify exact settlement/refund and available Visual credits. A prompt-only label preservation rule is **not** guaranteed pixel-perfect output; visually compare original label before commercial publishing.

## Release blockers outside copy/paste

This PR is not a substitute for **actual GAS V8 compilation, Drive OAuth consent, real provider API response validation, verified billing/free quota, triggers, and wallet tests**. Source-only CI does not attest runtime production readiness. Before every deployment preserve existing GAS v28 and confirm all P0 switches and historical records remain unchanged.

## Usability note

Member dashboard first view now places beginner actions **Buat Foto Jualan / Cari Produk Digital / Mulai Belajar / Minta Bantuan** ahead of token metrics. Financial charts remain below those simple choices. The visible member token balance is NOT automatically the same as the isolated Visual test wallet.

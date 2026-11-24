# Ngulik Digital — Isolated Public UI/CMS Handoff (PR #42)

**Environment:** GitHub feature branch only. **NOT deployed or merged.** Historical STAGING and Production Sheet rows unchanged.

## Authority
User's verbatim 24 Nov 2026 editorial brief is the copy source. This branch must not alter commerce calculations, OTP, token ledger, QRIS mutations or access to the 39 member learning entries.

## Implemented within this PR
- Removed the hardcoded guest-home promotion: published `site_content` rows and public allowlisted display settings are the only authored copy sources; missing hero shows **"Sedang memuat informasi..."**.
- Added independent `getPublicSettings` read endpoint with explicitly allowlisted public display keys. No Script Properties or secret fields returned.
- Added CMS text kinds and placements, stable `CNT-...` IDs, text-only HERO, optional image for editorial kinds, up to 1600 characters for verbatim instructional copy.
- Added a scoped clean/mobile-first guest landing stylesheet; no additional CSS files.
- Existing Admin CMS editor can create, edit (while draft), publish and archive editorial rows when server + client content gates permit.
- Added guarded editorial settings form for `nama_brand`, `tagline_brand`, `footer_identitas`, `footer_aksesibilitas` only. Financial/tariff settings do **not** use this editor.

## CSVs attached in ChatGPT, NOT imported
- `ngd_site_content_STAGING_DRAFT_20261124.csv`: 43 editorial rows, initial status **DRAFT**; stable IDs/placements and verbatim approved text.
- `ngd_pengaturan_sistem_STAGING_REVIEW_20261124.csv`: 13 targeted keys, financial/unknown values blank for owner review. **Do not bulk-overwrite** `pengaturan_sistem`.

## Hard NO-GO conditions
- No Production database access, deploy or mutation.
- Keep `NGD_MUTATIONS_ENABLED=false`, `NGD_FINANCE_ENABLED=false`, P0 checkout locked.
- Do not import the DRAFT copy as published, especially claims of specific runtimes, bundled offerings, shipping automation, Starter Pack access, credits, and commissions that have not passed feature UAT.
- QRIS unique code remains base + [100,999] and every transaction requires owner reconciliation. WhatsApp proof alone never means paid.
- 39 free learning links stay member-only.
- The new public UI will intentionally show neutral loading until a validated published `CNT-HERO-MAIN` exists. Never merge to public `main` before data readiness and content publish path are demonstrated.

## Missing before ready-for-review
1. Extend source-controlled CMS to auth, checkout, member, member portal, member affiliate, site-wide nav/footer and QRIS instructions **without** altering safety-critical financial behavior.
2. Complete admin CRUD for `ai_tools`, `modul_belajar`, `etalase_affiliate_luar`, and catalog settings with backend validation. Never equate frontend editability with backend authorization.
3. Review and resolve canonical brief claims against real service capabilities and production release policy.
4. Fully run GitHub CI (`node --test tests/*.test.cjs`), headless Chrome 360px and desktop after final changes.
5. Deploy source to **STAGING only**, independently compare API version/hash, back up Sheets, then import DRAFT only on explicit approval.
6. Manually verify admin publishing/editing/archiving and public private-content exclusion before considering PR ready/merge.

**Rollback:** close PR #42 and delete isolated branch. Current `main`, GAS STAGING and Production are unaffected.

# P1 Ngulik AI Studio — Frontend simulation contract

## Reference and design fidelity
User-provided reference: `ngulik_studio_ai_ad_product_visual_generator.html` (2026-11-23). This implementation adapts its six curated template identities, image references, three-view workflow, controls and colors to the existing member shell. It is not a standalone replacement page and does not load Tailwind CDN. Visual review against the reference is required before merge.

- View: `#ai` catalog includes a member-only card that links to `#ai-tool/ngulik-visual`; other text AI tools retain the old route.
- UI: `assets/ai-studio.css` scoped to `.ngd-studio`; styles outside this subtree remain unaffected. Typeface: Plus Jakarta Sans and JetBrains Mono; borders 1.5px, hard shadows, exact colors.
- Controller: `js/ai-studio.js` mounts on `#ngd-studio-root` through `window.NGD_STUDIO.mount(el)`.
- Simulation: in-memory balance **25 Cr**, tiers **2/4/6 Cr**; only `window.NGD_STUDIO.adapterMode === 'SIMULATION'`; **not** the member's actual `saldo_kredit`. Navigation does not change login/session; reloading resets simulation history and credits.
- Image preview is browser-local canvas compositing of existing images, product titles and promos. It is **not AI image generation** and is never described as provider output. Image sources currently refer to remote Unsplash samples; if network/CORS fails the Canvas falls back to a neutral placeholder. Uploaded files are handled through FileReader as data URLs and are not sent to a server.
- Export: browser Canvas `toDataURL('image/png')` with 1080px wide artboards (1:1, 4:5, 9:16). Output is a composited simulation poster. Session history is memory-only, capped at 8 renders.

## Future adapter contract (NOT implemented in P1)
```text
(1) Server returns authoritative template capability, provider cost and actual wallet balance.
(2) Client submits an authenticated, immutable job request with unique request_id.
(3) Server atomically reserves available credits using ledger/lock: reserve(job_id,cost).
(4) Provider generates / stores image on permitted backend, not browser with secret API key.
(5) Successful verified result: settle(reservation_id,asset_id) exactly once.
(6) Failure or timeout: release(reservation_id) exactly once, with reconciliation on uncertain partial commit.
(7) Only server-side verified ledger may update displayed real balance.
```

Current P1 local adapter has `reserve(cost)`, `settle(reservation)`, `release(reservation)` signatures as conceptual hooks only. The on-page credit number is explicitly labeled simulation. **Do not wire** these calls to GAS financial functions without an approved backend contract, concurrency/idempotency tests, authorization, sufficient provider cost controls and separate owner approval.

## Security and P0 exclusion
- No Apps Script source, `Diagnostics.gs`, payments, DB, settings or historical STAGING rows changed.
- No new authentication or fake login; guest browsing in `#ai` retains existing behavior.
- No use of `api('generateAI')`, checkout, `requestPayout`, remote AI providers or finance writes.
- Feature is a gated member route but carries a visible **SIMULASI** label; no generation actually consumes tokens.
- P0-E remains **NO-GO** with `NGD_MUTATIONS_ENABLED=false` and `NGD_FINANCE_ENABLED=false`.

## QA gates
- `node --test tests/*.test.cjs` with zero failures.
- Workflow `.github/workflows/validate.yml`: Chrome DevTools emulation 360 × 800, gallery has six cards, editor Canvas 1080×1350 when Kuliner template selected, document width <= 360, no unexpected old mobile nav.
- Manual visual inspection: 360px Android and 1366px desktop, remote images / upload, compare / overlay, PNG export, session history, keyboard interaction; compare to uploaded reference before approving merge.
- Test/PR may be reviewed independently; nothing is deployed from the P1 branch automatically.

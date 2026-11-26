# Ngulik Digital — Master UI/UX System v1 (Studio-derived)

Status: **P1 visual alignment candidate, PR review required**. Single source for all Ngulik Digital pages. This document does not change content, business rules or deploy.

## Design DNA — canonical and non-negotiable
| Token | Value | Usage |
|---|---|---|
| Main canvas | `#F6F5F0` | Public, member, admin background |
| Artboard | `#ECEAE3` | Quiet secondary surface, dotted-grid *inside Studio only* |
| Surface | `#FFFFFF` | Cards/forms/dialogs |
| Ink and stroke | `#141418` | Typography and 1.5px border |
| Violet | `#5B3DF5` | Primary actions, current navigation and focus |
| Lime | `#CCF349` | Accent, tool metadata, highlighted selected controls |
| Shadow | `3px 3px 0 #141418` | Controlled hard shadow on interactive card/surface |
| Primary font | Plus Jakarta Sans | Headings and UI |
| Metadata font | JetBrains Mono | Numbers and technical metadata |

Avoid emojis in new labels, fake OS traffic-light ornaments, glossy gradients, generic multi-color patterns, and extra navigation bars. Visual design must not imply success for unpaid orders or disabled features.

## One owner for visual presentation
- `assets/ngulik-design-system.css` is the **last stylesheet** on `index.html` and `staging/member.html`. It defines canonical global design tokens and cross-route component grammar, scoped to the existing `body.ngd-public-app` shell without changing body classes.
- `assets/ai-studio.css` owns the internal `.ngd-studio` subtree only; master styles intentionally exclude it. Do not duplicate Studio selectors in the master.
- Legacy styles are temporarily retained for layout and business forms. After screenshot-by-screenshot review and parity, migrate route-specific rules into coherent modules and retire superseded styles one at a time; do not add random overrides in other stylesheets.
- Existing icons and brand mark are preserved. New components use SVG stroke icons, not Unicode emoji.
- This is a CSS-only migration: DO NOT change `Code.gs`, `Diagnostics.gs`, finance, Script Properties, token ledger, auth or databases.

## Route inventory, ownership and intended visual treatment
All routes remain routed by `js/app.js` (same shell and auth). Coverage matrix:

| Scope | Routes | Treatment |
|---|---|---|
| Guest / public | `beranda`, `katalog`, `detail-produk`, `jasa`, `dukungan`, `login`, `daftar`, `admin-login` | Consistent master tokens for headers, cards, buttons, inputs, footer, modal |
| Member | `beranda`, `katalog`, `detail-produk`, `ai`, `ai-tool`, `pesanan`, `checkout`, `affiliate`, `belajar`, `portal`, `lms-course`, `lms-complete`, `jasa`, `dukungan`, `tiket`, `akun` | Same chrome, form grammar, gallery/card surfaces and role-appropriate controls |
| Admin | `admin`, `konten`, `produk`, `layanan`, `lms`, `lms-editor`, `lms-lesson`, `lms-ai`, `pesanan`, `member`, `member360`, `dukungan`, `tiket`, `rilis`, `antrean`, `pengaturan`, `akun` | Same typography and surfaces while preserving dense operational tables |
| Navigation and helper | `menu` | Existing shell presentation; no duplicate mobile navigation |

Route surface overlap (e.g. `beranda` by role) is intentional. Global route count is 33 keys. Tests assert route declarations and the shared CSS entrypoint link.

## QA gates for merge
1. `node --test tests/*.test.cjs` → 0 FAIL.
2. Chrome DevTools at **360 × 800** for guest, member, admin core routes; document/body scrollWidth <= 360 and headings/cards do not protrude.
3. Chrome member 1366px: one desktop nav, no mobile burger duplicated; entry routes unchanged.
4. Full screenshot review: compare all route classes on guest, member and admin, including forms and `checkout` without performing a payment. Check clipping, card hierarchy, status color semantics, focus and tap targets, visual contrast. **CI green is not equivalent to screenshot-perfect completion.**
5. Keep `NGD_MUTATIONS_ENABLED=false`, `NGD_FINANCE_ENABLED=false`; P0-E real transactions stay NO-GO.

## Architecture follow-up (after first safe integration)
- Audit remaining high-specificity legacy `!important` rules by route and migrate by component owner, with a measurable before/after screenshot; remove redundant CSS only after parity.
- Inventory and normalize UI illustrations, admin CRUD tables, status badges, member wallet and mobile dock. Preserve data-originated values and the semantics of PAID/PENDING/EXPIRED.
- Add per-route screenshot baselines for every authenticated route using synthetic data; do not use production accounts/DB in CI.
- Create reusable page headings, controls, card layouts, data tables and safe status badges as named components. No broad selectors on all `div` or universal shadow rules.
- Accessibility gate: contrast >= 4.5:1 for standard text, minimum 44px touch target for actionable controls, keyboard navigation, reduced-motion.

## V2 vivid harmonization (2026-11-23)
The owner rejected the first cross-route theme as too pale and not consistent with P1 Studio. A new, higher-specificity **component-owned V2 layer inside the same canonical CSS** establishes a bold visual signature without creating yet another stylesheet. It intentionally supersedes legacy `!important` rules at the presentation level.

### Distinctive visual landmarks to verify
- Public: strong electric purple editorial hero + acid-lime accent with existing media/art preserved; trust strip as lime outlined tiles; offer catalog white with hard-shadow borders; benefits lime and final CTA ink. Avoid treating old gradients as the final look.
- Member: **purple** wallet, **lime** trend card and primary action, clear **lime/white/ink** metric rhythm, outlined shortcut tiles, independent order and recent-activity surfaces.
- AI catalog, catalog, services, checkout: meaningful use of lime/purple/white hierarchy; preserve existing product photos, prices, copy, checkout conditions and order status.
- Learning, affiliates, support, admin: lime section anchors, hard-outline white cards and purple key actions; avoid recoloring payment or moderation badges to imply a false successful state.
- Mobile: 360px no horizontal overflow; wallet/chart stacks vertically; metric cards and trust statements become one column on narrow phones.

### Gated release checklist
- V2 is **visual only** and is not proof that every historical component is pixel-perfect. The route inventory remains the source for comprehensive manual audit.
- GitHub CI must validate Node tests and actual Chrome computed CSS colors for guest hero and member wallet/chart/metric on 360px.
- Screenshots from both guest/member/admin must be reviewed for clipping, contrast, broken buttons and editorial proportions before merge.
- Never alter `Code.gs`, `Diagnostics.gs`, GAS deployment, Script Properties, credits ledger, payment logic or staging/production sheets for UI migration.

## V6 Precision (26 November 2026)
Owner requests a unified, comfortable Neo-Brutalist UI without content changes. Existing ink/indigo/lime palette, 12px corners and hero imagery are retained; hard shadows reduced to 3px, common 1240px envelope, aligned card grids, bottom-aligned CTAs, 44px product actions, readable forms and scrollable admin tables. Narrow phones favor one catalog column instead of cramped cards. Admin module navigation wraps on desktop and scrolls within its own rail on mobile. Wrapper remains member-only, Premium admin-only. No changes to JS, CMS, business data, auth, provider or GAS. Legacy layout files remain until verified migration. Scoped CSS-first pass; visual/physical device QA remains separate. Budget increase limited to existing canonical CSS, no new stylesheet.

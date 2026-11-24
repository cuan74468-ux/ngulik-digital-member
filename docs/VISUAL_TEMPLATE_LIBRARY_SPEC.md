# Ngulik Visual Studio — Pustaka Inspirasi & Preset Reusable

Status: source-only Draft PR #35, no GAS deployment or provider activation.

## Benchmark

Public MaxAdz UX (https://maxadz.com/ and https://www.maxadz.com/legal/faq.html): searchable, category-filtered templates with a clear "Gunakan" action and an editor where sellers replace the reference photo and product details. Their documented recommendation is to keep the product category aligned with the template. Ngulik uses this workflow pattern, not their UI artwork, branded templates, images, code or pricing.

## Functional architecture

- 12 trusted studio scene templates (4 product categories x 3 optical scenarios) derive from fixed Context Skill Matrix IDs. Six older Canvas designs remain under "Desain Cepat".
- Scene cards show labeled **reference photos** from previously used licensed/public gallery sources. These are visual inspiration, NOT the user's product image, not generated output, and never a reference source for a paid Img2Img call.
- Filters include product category, "Preset Saya", and "Desain Cepat", plus search.
- "Detail" reveals machine-readable scenario identity and optical scope; "Gunakan" applies category, exact scenario, phone restoration ON, 4:5 composition, one image, and default Kontext Pro while requiring the member to upload their own actual product photo for Img2Img.
- Editor fields and preset records are editable. Custom presets contain category/scenario, image ratio, AI machine ID, count, restoration and OPTIONAL user-authored text fields. Original image bytes, generated output, backend 12-layer recipes, URLs, secrets and cost estimates are never serialized into a template.
- Local browser persistence is namespaced by **member_id** and guarded against missing/invalid identity, with a maximum of 20 presets per member; only simple preference/draft settings are stored, never photo data or session tokens. Device-local storage is not a substitute for private server backups.
- Optional STAGING cloud sync uses isolated `visualTemplateList`, `visualTemplateSave`, `visualTemplateDelete`. Strict server session validation and private-owner Drive store. `NGD_VISUAL_TEMPLATES_ENABLED=false` is the dedicated default OFF switch; this feature does not require or change `NGD_FINANCE_ENABLED`, `NGD_MUTATIONS_ENABLED`, or live AI switches.
- Server validates owned template IDs, product_category + studio_scenario allowlist, official machine ID and counts (1/2/4), ratio, restoration mode, display string length and strict field allowlist. No arbitrary prompt/url/Script Properties and maximum 20 presets.
- P0 credit balances are not used, provider calls remain OFF, GAS STAGING v28 remains unchanged until explicitly approved.

## QA gate

1. Unit test catalog 12 scenes + unchanged six classic; server rejects category mismatch, forged payload, arbitrary URLs, invalid prices/ratios.
2. Mock member scoped storage: save, reload, reuse, delete, switch users; never expose another user's presets or photo bytes in localStorage.
3. Chrome real 360px: gallery 12 visible, six classics remain, bottle filter = 3 scenes, Detail can expand, Gunakan applies Obsidian, editor is usable and has no horizontal overflow.
4. R-0: exactly existing stylesheets; CSS only in assets/ai-studio.css, +3237 UTF-8 bytes explicitly accounted in test baseline, no new !important.
5. Follow all P0 guards and no deployment. Release of cloud sync requires private Drive folder + scope and independent enable flag. Image generation still requires provider quota and explicitly approved budget.

## Limitations / next checks

- Device-local presets only persist in the browser and are lost if browser site data is cleared; cloud persistence cannot be claimed until the GAS STAGING implementation is deployed and configured.
- Scene thumbnails are references, not an accurate example of generated result quality; do not label them "hasil AI".
- Third-party images should be replaced with rights-verified branded originals before public marketing launch, and cached/hosted locally to remove external image dependency.

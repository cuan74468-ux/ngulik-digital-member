'use strict';
// R-0: reproducible read-only inventory and CSS ratchet. No dependency/build required.
// Doc06 photo-backed hero: reviewed byte-only change; no added stylesheets or !important.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Audited 24 Nov: Visual beginner UX adds 1,332 bytes to existing ai-studio.css only;
// no new stylesheet and no additional !important. Caps remain strict after this ratchet.
// zero added stylesheets and zero additional !important. Preserve ratchet elsewhere.
const limits = Object.freeze({
  'assets/app.css': [22721, 2],
  'assets/member-mobile.css': [1036, 1],
  'assets/unified-theme.css': [59577, 5],
  'assets/experience.css': [21568, 3],
  'assets/learning-studio.css': [58208, 5],
  'assets/styles.css': [43281, 13],
  'assets/portfolio-adaptation.css': [65924, 9],
  'assets/home-v5.css': [27182, 2],
  'assets/learning-journey.css': [9144, 1],
  'assets/marketplace-public.css': [27403, 1],
  'assets/affiliate-partner.css': [18660, 4],
  'assets/brand-official.css': [2729, 1],
  'assets/ai-catalog.css': [20902, 0],
  'assets/ai-studio.css': [28690, 3],
  'assets/content-media.css': [4160, 0],
  'assets/catalog-experience-v3.css': [19782, 0],
  'assets/commission-experience-v2.css': [20944, 5],
  'assets/checkout-qris-unified.css': [5611, 1],
  'assets/marketplace-visuals-v4.css': [5249, 0],
  'assets/marketplace-ref-v5.css': [32712, 306],
  'assets/member-marketplace-v7.css': [29710, 219],
  'assets/public-experience-v8.css': [26236, 159],
  'assets/catalog-campaign-v9.css': [15930, 48],
  'assets/brand-experience-v10.css': [42381, 324],
  'assets/mobile-critical-v16.css': [20788, 201],
  'assets/landing-guest-v1.css': [17912, 33],
  'assets/guest-sales-trust-v1.css': [18156, 25],
  'assets/product-detail-v1.css': [13213, 40],
  'assets/member-native-dashboard-v1.css': [31615, 224],
  'assets/ngulik-design-system.css': [49432, 474],
  'assets/staging-native-mobile.css': [9008, 1]
});

const budgets = Object.freeze({
  'index.html': { count: 30, bytes: 760853, important: 2109 },
  'staging/member.html': { count: 31, bytes: 769861, important: 2110 }
});

function inspectEntry(entry) {
  const html = fs.readFileSync(path.join(root, entry), 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/gi)];
  const seen = new Set();
  const files = links.map(match => {
    const href = match[1];
    assert.doesNotMatch(href, /^(?:https?:|\/\/|data:)/i, entry + ': external stylesheet cannot be measured');
    const clean = href.split(/[?#]/)[0];
    const absolute = path.resolve(root, path.dirname(entry), clean);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    assert.ok(relative.startsWith('assets/') && relative.endsWith('.css'), entry + ': unexpected CSS target ' + relative);
    assert.ok(!seen.has(relative), entry + ': duplicate CSS reference ' + relative);
    seen.add(relative);
    const source = fs.readFileSync(absolute, 'utf8');
    return {
      file: relative,
      bytes: Buffer.byteLength(source, 'utf8'),
      important: (source.match(/!important\b/g) || []).length
    };
  });
  return {
    entry,
    count: files.length,
    bytes: files.reduce((a, x) => a + x.bytes, 0),
    important: files.reduce((a, x) => a + x.important, 0),
    files
  };
}

function routerKeys() {
  const src = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const start = src.indexOf('const screens=');
  const end = src.indexOf('const guestNav=', start);
  assert.ok(start >= 0 && end > start, 'cannot locate source router declaration');
  const segment = src.slice(start, end);
  return [...segment.matchAll(/(?:\['([^']+)'\]|([a-z][a-z0-9]*))\s*:\s*\[/g)]
    .map(m => m[1] || m[2]);
}

test('R-0 inventory prints every loaded CSS file and all declared router keys', () => {
  const routes = routerKeys();
  const publicCss = inspectEntry('index.html');
  const stagingCss = inspectEntry('staging/member.html');
  const appBytes = fs.statSync(path.join(root, 'js/app.js')).size;
  console.log('NGD_R0_INVENTORY ' + JSON.stringify({
    routeCount: routes.length, routes, appBytes,
    stylesheets: [publicCss, stagingCss]
  }));
  assert.equal(new Set(routes).size, routes.length, 'duplicate router key');
  assert.equal(routes.length, 33, 'router source has 33 keys; short list of 32 omitted admin-login');
  assert.ok(routes.includes('admin-login'), 'admin-login must be inventoried');
});

test('R-0 CSS ratchet: number, UTF-8 bytes and !important never exceed source baseline', () => {
  for (const [entry, budget] of Object.entries(budgets)) {
    const result = inspectEntry(entry);
    for (const metric of ['count', 'bytes', 'important']) {
      assert.ok(result[metric] <= budget[metric],
        entry + ' ' + metric + ' increased: ' + result[metric] + ' > ' + budget[metric]);
    }
    for (const item of result.files) {
      const limit = limits[item.file];
      assert.ok(limit, 'new CSS file requires review and reduction, not untracked growth: ' + item.file);
      assert.ok(item.bytes <= limit[0], item.file + ' bytes grew ' + item.bytes + ' > ' + limit[0]);
      assert.ok(item.important <= limit[1], item.file + ' !important grew ' + item.important + ' > ' + limit[1]);
    }
  }
  assert.equal(Object.keys(limits).length, 31);
  const publicCss = inspectEntry('index.html');
  const stagingCss = inspectEntry('staging/member.html');
  assert.ok(!publicCss.files.some(x => x.file === 'assets/staging-native-mobile.css'));
  assert.ok(stagingCss.files.some(x => x.file === 'assets/staging-native-mobile.css'));
});

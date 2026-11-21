/**
 * Ngulik Digital — deterministic checks of pure backend business rules.
 * Run: node --test tests/backend-pure.test.cjs
 * Requires Node.js only; no Google account, network, or packages.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');
const diagnostics = fs.readFileSync(path.join(root, 'apps-script', 'Diagnostics.gs'), 'utf8');
const log = [];
const context = vm.createContext({
  console: {
    log: (...args) => log.push(args.map(String).join(' ')),
    error: (...args) => log.push('ERROR ' + args.map(String).join(' ')),
    warn: (...args) => log.push('WARN ' + args.map(String).join(' '))
  }
});
// Only defines functions/constants; none of the tests touch SpreadsheetApp.
vm.runInContext(code, context, {filename: 'Code.gs', timeout: 10000});
vm.runInContext(diagnostics, context, {filename: 'Diagnostics.gs', timeout: 10000});

const suites = [
  ['waiting list and capacity (12 cases)', 'diagnosticMemberQueueScenarios()', 'MEMBER_QUEUE_SCENARIOS_OK'],
  ['finance reconciliation (29 cases)', 'diagnosticFinanceScenarios()', 'FINANCE_SCENARIOS_OK'],
  ['admin settings (15 cases)', 'diagnosticAdminSettingsScenarios()', 'ADMIN_SETTINGS_SCENARIOS_OK']
];
for (const [label, expression, expected] of suites) {
  test(label, () => {
    const response = vm.runInContext(expression, context, {timeout: 10000});
    assert.equal(response, expected, 'Diagnostic suite failed; see logs');
  });
}
test('56 individual scenario assertions executed', () => {
  const passes = log.filter(x => x.startsWith('PASS:')).length;
  assert.equal(passes, 56);
});

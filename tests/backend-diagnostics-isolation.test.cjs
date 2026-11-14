'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');
const diagnostics = fs.readFileSync(path.join(root, 'apps-script/Diagnostics.gs'), 'utf8');

function fixture(configuredId = '') {
  const calls = [];
  const db = { getName() { return 'Isolated QA database'; }, getSheets() { return []; },
    getSheetByName(name) {
      const headers = vm.runInContext('NGD.HEADERS', context)[name];
      if (!headers) return null;
      const actual = headers.split(',');
      if (name === fixture.modifiedTab) actual.pop();
      return {getLastColumn() { return actual.length; },
        getRange(row, col, height, width) {
          assert.equal(row, 1); assert.equal(col, 1);
          assert.equal(height, 1); assert.equal(width, actual.length);
          return {getValues() { return [actual]; }};
        }};
    }};
  const context = vm.createContext({
    console: { log() {}, error() {} },
    PropertiesService: { getScriptProperties() {
      return {getProperty(name) {
        assert.equal(name, 'NGD_DB_ID');
        return configuredId;
      }};
    }},
    SpreadsheetApp: {openById(id) {calls.push(id); return db;}}
  });
  vm.runInContext(core, context, {timeout: 10000});
  vm.runInContext(diagnostics, context, {timeout: 10000});
  return {context, calls};
}

test('diagnostics never embed the live spreadsheet id or a default fallback', () => {
  assert.doesNotMatch(diagnostics, /DIAG_DB_ID/);
  assert.match(diagnostics, /NGD_DB_ID/);
  assert.ok(diagnostics.includes('function diagnosticDb_()'));
});

test('missing explicit DB property fails closed without opening any spreadsheet', () => {
  const {context, calls} = fixture('');
  assert.throws(() => context.diagnosticDatabase(), /DIAGNOSTIC_DB_NOT_CONFIGURED/);
  assert.throws(() => context.diagnosticSchema(), /DIAGNOSTIC_DB_NOT_CONFIGURED/);
  assert.equal(calls.length, 0);
});

test('diagnostic database and schema access the exact configured database', () => {
  const {context, calls} = fixture('qa-isolated-123');
  assert.equal(context.diagnosticDatabase(), 'DB_OK');
  assert.equal(context.diagnosticSchema(), 'SCHEMA_OK');
  assert.deepEqual(calls, ['qa-isolated-123', 'qa-isolated-123']);
});

test('diagnostics reject a stale LMS progress header even if the sheet exists', () => {
  fixture.modifiedTab = 'lms_progress';
  try {
    const {context} = fixture('qa-isolated-123');
    assert.throws(() => context.diagnosticSchema(), /HEADER_MISMATCH: lms_progress/);
  } finally { fixture.modifiedTab = ''; }
});

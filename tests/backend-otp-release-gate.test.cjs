'use strict';
// P0 safety regression: registration must stay closed until server-side OTP
// verification is installed. No Google network, account, or Sheet is touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');

function boot(props = {}) {
  let writes = 0;
  const sandbox = {
    console: {log(){}, warn(){}, error(){}},
    PropertiesService: {
      getScriptProperties() {
        return {getProperty(key) {return Object.prototype.hasOwnProperty.call(props, key) ? props[key] : null;}};
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {filename: 'Code.gs', timeout: 2000});
  // A call here means the fail-closed registration gate did not hold.
  sandbox.withLock_ = () => { writes++; throw new Error('UNEXPECTED_MUTATION_PATH'); };
  return {sandbox, count: () => writes};
}

const sample = {
  wa: '081234567890',
  pin: '285947',
  nama: 'Pengujian Aman',
  nama_usaha: 'Usaha Uji',
  setuju_kebijakan: true
};

test('registration blocked while OTP flag is absent', () => {
  const env = boot({NGD_REGISTRATION_ENABLED: 'true', NGD_MUTATIONS_ENABLED: 'true'});
  assert.throws(() => env.sandbox.authRegister_(sample), /verifikasi OTP WhatsApp/);
  assert.equal(env.count(), 0);
});

test('registration blocked if OTP flag is true but no verifier is installed', () => {
  const env = boot({NGD_OTP_REGISTRATION_ENABLED: 'true', NGD_REGISTRATION_ENABLED: 'true'});
  assert.throws(() => env.sandbox.authRegister_(sample), /verifikasi OTP WhatsApp/);
  assert.equal(env.count(), 0);
});

test('OTP verification runs before member insertion when verifier exists', () => {
  const env = boot({NGD_OTP_REGISTRATION_ENABLED: 'true'});
  let attemptedWrites = 0;
  let verifierCalls = 0;
  env.sandbox.withLock_ = fn => fn();
  env.sandbox.ngdConsumeVerifiedRegistrationOtp_ = () => {
    verifierCalls++;
    throw new Error('OTP_REJECTED_BY_TEST_VERIFIER');
  };
  env.sandbox.appendRow_ = () => { attemptedWrites++; };
  env.sandbox.normalizeWa_ = () => '6281234567890';
  env.sandbox.checkNewPin_ = () => {};
  env.sandbox.safeText_ = v => String(v || '');
  env.sandbox.byId_ = () => null;
  assert.throws(() => env.sandbox.authRegister_(sample), /OTP_REJECTED_BY_TEST_VERIFIER/);
  assert.equal(verifierCalls, 1);
  assert.equal(attemptedWrites, 0);
});

test('readAll_ skips blank rows but preserves physical row and zero/false', () => {
  const env = boot();
  const data = [
    ['', '', ''],
    ['M-0001', false, 0],
    ['', '', ''],
    ['M-0002', '', 12]
  ];
  env.sandbox.tbl_ = () => ({
    headers: ['member_id', 'active', 'credits'],
    sheet: {
      getLastRow: () => 5,
      getRange: () => ({getValues: () => data})
    }
  });
  const rows = env.sandbox.readAll_('members');
  assert.equal(rows.length, 2);
  assert.equal(rows[0]._row, 3);
  assert.equal(rows[0].member_id, 'M-0001');
  assert.equal(rows[0].active, false);
  assert.equal(rows[0].credits, 0);
  assert.equal(rows[1]._row, 5);
});

test('readAll_ returns empty list for a header-only sheet', () => {
  const env = boot();
  env.sandbox.tbl_ = () => ({
    headers: ['id'],
    sheet: {
      getLastRow: () => 1,
      getRange: () => {throw new Error('SHOULD_NOT_READ');}
    }
  });
  assert.equal(env.sandbox.readAll_('members').length, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationErrorMessage, validateApplicationInput } from './applicationValidation.js';

const session = { capacity: 8 };
const valid = {
  name: '홍길동', email: 'visitor@example.com', phone: '',
  contactLanguage: 'ko', attendeeCount: 2, note: '', privacyConsent: true,
};

test('valid application input passes and server capacity remains authoritative', () => {
  assert.deepEqual(validateApplicationInput(valid, session, 'v1'), { valid: true, errors: {} });
});

for (const [field, value] of [
  ['name', '  '], ['email', 'not-an-email'], ['contactLanguage', 'fr'],
  ['attendeeCount', 0], ['attendeeCount', 9], ['note', 'x'.repeat(1001)],
]) {
  test(`invalid ${field} is reported`, () => {
    const result = validateApplicationInput({ ...valid, [field]: value }, session, 'v1');
    assert.equal(result.valid, false);
    assert.ok(result.errors[field]);
  });
}

test('missing consent and privacy notice version are rejected', () => {
  assert.ok(validateApplicationInput({ ...valid, privacyConsent: false }, session, 'v1').errors.privacyConsent);
  assert.ok(validateApplicationInput(valid, session, '').errors.privacyConsent);
});

test('known RPC codes become Korean messages and unknown errors do not leak SQL text', () => {
  assert.match(applicationErrorMessage({ message: 'SESSION_FULL' }), /정원/);
  assert.match(applicationErrorMessage({ message: 'APPLICATION_CLOSED' }), /모집/);
  assert.equal(applicationErrorMessage({ message: 'select * from private.table' }), '신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
});

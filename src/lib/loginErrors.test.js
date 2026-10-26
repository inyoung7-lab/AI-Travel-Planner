import test from 'node:test';
import assert from 'node:assert/strict';
import { loginErrorMessage } from './loginErrors.js';

test('invalid credentials use a Korean message for both wrong email and password', () => {
  const expected = '이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해 주세요.';
  assert.equal(loginErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }), expected);
  assert.equal(loginErrorMessage(new Error('Invalid login credentials')), expected);
});

test('confirmation, quota and network failures are not presented as password errors', () => {
  assert.match(loginErrorMessage({ code: 'email_not_confirmed' }), /이메일 인증/);
  assert.match(loginErrorMessage({ status: 429 }), /잠시 후/);
  assert.match(loginErrorMessage({ name: 'AuthRetryableFetchError' }), /연결/);
  assert.match(loginErrorMessage(new TypeError('Failed to fetch')), /연결/);
});

test('unknown provider diagnostics are never displayed verbatim', () => {
  assert.equal(loginErrorMessage(new Error('Internal database failure')), '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
});

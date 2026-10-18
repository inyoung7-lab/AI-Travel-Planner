import test from 'node:test';
import assert from 'node:assert/strict';
import { toApplicationRpcPayload } from './applicationRpcPayload.js';

test('maps trimmed application fields to exact RPC parameters without identity or fee', () => {
  assert.deepEqual(toApplicationRpcPayload({
    sessionId: '16', name: ' 홍길동 ', email: ' visitor@example.com ', phone: ' 010-0000-0000 ',
    contactLanguage: 'ko', attendeeCount: '2', note: ' 전달 메모 ',
    privacyNoticeVersion: 'v1', privacyConsent: true, authUserId: 'must-not-be-sent', unitFee: 999999,
  }), {
    p_session_id: 16,
    p_name: '홍길동',
    p_email: 'visitor@example.com',
    p_phone: '010-0000-0000',
    p_contact_language: 'ko',
    p_attendee_count: 2,
    p_note: '전달 메모',
    p_privacy_notice_version: 'v1',
    p_privacy_consent: true,
  });
});

test('sends blank optional fields as null', () => {
  const result = toApplicationRpcPayload({
    sessionId: 3, name: '이름', email: 'a@example.com', phone: ' ', contactLanguage: 'ko',
    attendeeCount: 1, note: '', privacyNoticeVersion: 'v1', privacyConsent: true,
  });
  assert.equal(result.p_phone, null);
  assert.equal(result.p_note, null);
});
